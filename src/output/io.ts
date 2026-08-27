import { createColorizer, type Colorize, type Style } from "./color.js";

export type Io = {
  readonly isTTY: boolean;
  readonly isStderrTTY: boolean;
  readonly isInteractive: boolean;
  readonly width: number;
  readonly color: boolean;
  readonly hyperlinks: boolean;
  readonly style: Colorize;
  /** Machine-readable result. Goes to stdout. */
  out(text: string): void;
  /** Human chatter. Goes to stderr, so it never pollutes a pipe. */
  info(text: string): void;
  warn(text: string): void;
  error(text: string): void;
};

export type CreateIoOptions = {
  color?: boolean | undefined;
  env?: NodeJS.ProcessEnv | undefined;
};

/**
 * Mirrors `gh`'s `GH_FORCE_TTY`: accepts `true`, a column count, or a percentage.
 * The single most useful variable for testing and for CI systems with fake terminals.
 */
const parseForceTty = (
  raw: string | undefined,
  fallbackWidth: number,
): { forced: boolean; width: number } => {
  if (raw === undefined || raw === "" || raw === "false" || raw === "0") {
    return { forced: false, width: fallbackWidth };
  }
  const percent = /^(\d+)%$/.exec(raw);
  if (percent?.[1] !== undefined) {
    return { forced: true, width: Math.floor((fallbackWidth * Number(percent[1])) / 100) };
  }
  const columns = Number.parseInt(raw, 10);
  return Number.isFinite(columns) && columns > 0
    ? { forced: true, width: columns }
    : { forced: true, width: fallbackWidth };
};

const supportsHyperlinks = (env: NodeJS.ProcessEnv, isTTY: boolean): boolean => {
  if (env["BB_FORCE_HYPERLINKS"] === "1") return true;
  if (env["BB_FORCE_HYPERLINKS"] === "0") return false;
  if (!isTTY || env["CI"] !== undefined) return false;
  const program = env["TERM_PROGRAM"] ?? "";
  if (["iTerm.app", "WezTerm", "vscode", "ghostty", "Hyper"].includes(program)) return true;
  if (env["WT_SESSION"] !== undefined) return true;
  const vte = Number.parseInt(env["VTE_VERSION"] ?? "", 10);
  return Number.isFinite(vte) && vte >= 5000;
};

export const createIo = (options: CreateIoOptions = {}): Io => {
  const env = options.env ?? process.env;
  const forceTty = parseForceTty(env["BB_FORCE_TTY"], process.stdout.columns ?? 80);

  const isTTY = forceTty.forced || process.stdout.isTTY === true;
  const isStderrTTY = forceTty.forced || process.stderr.isTTY === true;
  const color = options.color ?? (env["NO_COLOR"] === undefined && isTTY);

  const io: Io = {
    isTTY,
    isStderrTTY,
    isInteractive:
      process.stdin.isTTY === true &&
      isTTY &&
      env["CI"] === undefined &&
      env["BB_PROMPT_DISABLED"] !== "1",
    width: forceTty.forced ? forceTty.width : (process.stdout.columns ?? 80),
    color,
    hyperlinks: supportsHyperlinks(env, isTTY),
    style: createColorizer(color),
    out: (text) => {
      process.stdout.write(`${text}\n`);
    },
    info: (text) => {
      process.stderr.write(`${text}\n`);
    },
    warn: (text) => {
      process.stderr.write(`${createColorizer(color)("yellow" as Style, "warning:")} ${text}\n`);
    },
    error: (text) => {
      process.stderr.write(`${createColorizer(color)("red" as Style, "error:")} ${text}\n`);
    },
  };
  return io;
};

/** A capturing Io for tests: no real terminal, no real streams. */
export type FakeIo = Io & { stdout: string; stderr: string };

export const createFakeIo = (overrides: Partial<Io> = {}): FakeIo => {
  const color = overrides.color ?? false;
  const state = { stdout: "", stderr: "" };
  const io: FakeIo = {
    isTTY: false,
    isStderrTTY: false,
    isInteractive: false,
    width: 80,
    color,
    hyperlinks: false,
    style: createColorizer(color),
    out: (text) => {
      state.stdout += `${text}\n`;
    },
    info: (text) => {
      state.stderr += `${text}\n`;
    },
    warn: (text) => {
      state.stderr += `warning: ${text}\n`;
    },
    error: (text) => {
      state.stderr += `error: ${text}\n`;
    },
    ...overrides,
    get stdout() {
      return state.stdout;
    },
    get stderr() {
      return state.stderr;
    },
  };
  return io;
};
