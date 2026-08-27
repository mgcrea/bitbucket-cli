import type { Colorize, Style } from "../color.js";
import { displayWidth, padEnd, truncate as truncateWidth } from "../width.js";

export type TemplateContext = {
  style: Colorize;
  hyperlinks: boolean;
  /** Buffered rows awaiting `tablerender`. */
  tableRows: string[][];
};

export type TemplateFunc = (context: TemplateContext, ...args: unknown[]) => unknown;

const asString = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
};

const asNumber = (value: unknown): number => Number(asString(value));

/** Go's truthiness: false, 0, "", nil, and any empty collection. */
export const isTruthy = (value: unknown): boolean => {
  if (value === null || value === undefined || value === false) return false;
  if (value === 0 || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return Boolean(value);
};

const RELATIVE: readonly [number, Intl.RelativeTimeFormatUnit][] = [
  [60, "second"],
  [3600, "minute"],
  [86_400, "hour"],
  [604_800, "day"],
  [2_629_800, "week"],
  [31_557_600, "month"],
];

const timeago = (value: unknown): string => {
  const parsed = Date.parse(asString(value));
  if (Number.isNaN(parsed)) {
    return asString(value);
  }
  const seconds = (Date.now() - parsed) / 1000;
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [limit, unit] of RELATIVE) {
    if (Math.abs(seconds) < limit) {
      const divisor = limit === 60 ? 1 : RELATIVE[RELATIVE.findIndex(([l]) => l === limit) - 1]![0];
      return format.format(-Math.round(seconds / divisor), unit);
    }
  }
  return format.format(-Math.round(seconds / 31_557_600), "year");
};

/**
 * Go's reference-time layout, e.g. `2006-01-02 15:04:05`.
 *
 * A useful subset rather than the whole thing; anything unrecognised is left alone so
 * it is visible in the output rather than silently mis-formatted.
 */
const GO_LAYOUT: readonly [string, (date: Date) => string][] = [
  ["2006", (d) => String(d.getFullYear())],
  ["01", (d) => String(d.getMonth() + 1).padStart(2, "0")],
  ["02", (d) => String(d.getDate()).padStart(2, "0")],
  ["15", (d) => String(d.getHours()).padStart(2, "0")],
  ["04", (d) => String(d.getMinutes()).padStart(2, "0")],
  ["05", (d) => String(d.getSeconds()).padStart(2, "0")],
  ["Jan", (d) => d.toLocaleString("en", { month: "short" })],
  ["Mon", (d) => d.toLocaleString("en", { weekday: "short" })],
];

const timefmt = (layout: unknown, value: unknown): string => {
  const raw = asString(layout);
  const date = new Date(asString(value));
  if (Number.isNaN(date.getTime())) {
    return asString(value);
  }
  if (raw === "iso") return date.toISOString();
  if (raw === "relative") return timeago(value);

  let result = "";
  let index = 0;
  outer: while (index < raw.length) {
    for (const [token, render] of GO_LAYOUT) {
      if (raw.startsWith(token, index)) {
        result += render(date);
        index += token.length;
        continue outer;
      }
    }
    result += raw[index];
    index += 1;
  }
  return result;
};

const STATE_STYLES: Record<string, Style> = {
  OPEN: "green",
  MERGED: "magenta",
  DECLINED: "red",
  SUPERSEDED: "yellow",
  SUCCESSFUL: "green",
  FAILED: "red",
  INPROGRESS: "yellow",
  STOPPED: "dim",
};

export const FUNCS: Record<string, TemplateFunc> = {
  // gh's core helper set. Names and semantics are kept identical so existing
  // `gh --template` snippets paste in unchanged.
  color: (context, style, value) => context.style(asString(style) as Style, asString(value)),
  autocolor: (context, style, value) =>
    // Same as `color`, but a no-op when output is not a terminal — which is what makes
    // a template safe to pipe.
    context.style(asString(style) as Style, asString(value)),
  truncate: (_context, max, value) => truncateWidth(asString(value), asNumber(max)),
  join: (_context, separator, list) =>
    (Array.isArray(list) ? list : []).map(asString).join(asString(separator)),
  pluck: (_context, field, list) =>
    (Array.isArray(list) ? list : []).map((item) =>
      typeof item === "object" && item !== null
        ? (item as Record<string, unknown>)[asString(field)]
        : undefined,
    ),
  timeago: (_context, value) => timeago(value),
  timefmt: (_context, layout, value) => timefmt(layout, value),
  hyperlink: (context, url, text) =>
    context.hyperlinks
      ? `${String.fromCharCode(27)}]8;;${asString(url)}${String.fromCharCode(7)}${asString(text)}${String.fromCharCode(27)}]8;;${String.fromCharCode(7)}`
      : asString(text),

  // Buffer a row now, measure and emit every row on `tablerender`. This is what lets a
  // template build an aligned table without knowing the column widths up front.
  tablerow: (context, ...cells) => {
    context.tableRows.push(cells.map(asString));
    return "";
  },
  tablerender: (context) => {
    const rows = context.tableRows;
    context.tableRows = [];
    if (rows.length === 0) {
      return "";
    }
    const columns = Math.max(...rows.map((row) => row.length));
    const widths = Array.from({ length: columns }, (_unused, index) =>
      Math.max(...rows.map((row) => displayWidth(row[index] ?? ""))),
    );
    return `${rows
      .map((row) =>
        row
          .map((cell, index) =>
            index === row.length - 1 ? cell : padEnd(cell, widths[index] ?? 0),
          )
          .join("  ")
          .trimEnd(),
      )
      .join("\n")}\n`;
  },

  // sprig helpers gh exposes.
  contains: (_context, needle, haystack) => asString(haystack).includes(asString(needle)),
  hasPrefix: (_context, prefix, value) => asString(value).startsWith(asString(prefix)),
  hasSuffix: (_context, suffix, value) => asString(value).endsWith(asString(suffix)),
  regexMatch: (_context, pattern, value) => new RegExp(asString(pattern)).test(asString(value)),

  // Go builtins people reach for.
  printf: (_context, format, ...args) => {
    let index = 0;
    return asString(format).replace(/%[sdvq%]/g, (match) => {
      if (match === "%%") return "%";
      const argument = args[index];
      index += 1;
      return match === "%q" ? JSON.stringify(asString(argument)) : asString(argument);
    });
  },
  len: (_context, value) =>
    Array.isArray(value)
      ? value.length
      : typeof value === "string"
        ? value.length
        : typeof value === "object" && value !== null
          ? Object.keys(value).length
          : 0,
  eq: (_context, a, b) => asString(a) === asString(b),
  ne: (_context, a, b) => asString(a) !== asString(b),
  lt: (_context, a, b) => asNumber(a) < asNumber(b),
  le: (_context, a, b) => asNumber(a) <= asNumber(b),
  gt: (_context, a, b) => asNumber(a) > asNumber(b),
  ge: (_context, a, b) => asNumber(a) >= asNumber(b),
  and: (_context, ...values) => values.every((value) => isTruthy(value)),
  or: (_context, ...values) => values.some((value) => isTruthy(value)),
  not: (_context, value) => !isTruthy(value),
  index: (_context, target, key) => {
    if (Array.isArray(target)) return target[asNumber(key)];
    if (typeof target === "object" && target !== null) {
      return (target as Record<string, unknown>)[asString(key)];
    }
    return undefined;
  },

  // Bitbucket-specific, deliberately namespaced so they cannot collide with gh's set.
  bbstate: (context, value) => {
    const state = asString(value).toUpperCase();
    const style = STATE_STYLES[state];
    return style === undefined ? asString(value) : context.style(style, asString(value));
  },
  bbpipestate: (context, value) => {
    const state = asString(value).toUpperCase();
    const style = STATE_STYLES[state];
    return style === undefined ? asString(value) : context.style(style, asString(value));
  },
};

export { asString };
