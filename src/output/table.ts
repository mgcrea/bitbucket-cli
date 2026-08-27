import type { Io } from "./io.js";
import { displayWidth, padEnd, truncate } from "./width.js";

export type Column<T> = {
  header: string;
  /** The cell's text. Must already be coloured if it is going to be. */
  value: (row: T) => string;
  /** Absorbs leftover width, and is the column truncated when space runs out. */
  flex?: boolean | undefined;
  minWidth?: number | undefined;
  align?: "left" | "right" | undefined;
};

/**
 * Renders rows as a table on a terminal, or as TSV when piped.
 *
 * The piped form has no header, no padding, no colour and no truncation. That one rule
 * is what makes `bb pr list | awk -F'\t' '{print $1}'` work, and it is why every list
 * command can be composed with ordinary shell tools without a `--json` round trip.
 */
export const renderTable = <T>(rows: readonly T[], columns: readonly Column<T>[], io: Io): void => {
  if (rows.length === 0) {
    return;
  }

  const cells = rows.map((row) => columns.map((column) => column.value(row)));

  if (!io.isTTY) {
    for (const line of cells) {
      // Strip tabs and newlines out of cell content so the separator stays unambiguous.
      io.out(line.map((cell) => cell.replace(/[\t\n\r]+/g, " ")).join("\t"));
    }
    return;
  }

  const natural = columns.map((column, index) =>
    Math.max(
      displayWidth(column.header),
      ...cells.map((line) => displayWidth(line[index] ?? "")),
      column.minWidth ?? 0,
    ),
  );

  const gap = 2;
  const totalGap = gap * Math.max(0, columns.length - 1);
  const overflow = natural.reduce((sum, width) => sum + width, 0) + totalGap - io.width;

  const widths = [...natural];
  if (overflow > 0) {
    // Take the overflow out of the flexible columns, last one first, never shrinking a
    // column below its declared minimum.
    let remaining = overflow;
    for (let index = columns.length - 1; index >= 0 && remaining > 0; index -= 1) {
      if (columns[index]?.flex !== true) {
        continue;
      }
      const floor = columns[index]?.minWidth ?? 8;
      const current = widths[index] ?? 0;
      const reduction = Math.min(remaining, Math.max(0, current - floor));
      widths[index] = current - reduction;
      remaining -= reduction;
    }
  }

  io.out(
    columns
      .map((column, index) => io.style("dim", padEnd(column.header, widths[index] ?? 0)))
      .join(" ".repeat(gap))
      .trimEnd(),
  );

  for (const line of cells) {
    io.out(
      columns
        .map((column, index) => {
          const width = widths[index] ?? 0;
          const cell = truncate(line[index] ?? "", width);
          return column.align === "right"
            ? " ".repeat(Math.max(0, width - displayWidth(cell))) + cell
            : padEnd(cell, width);
        })
        .join(" ".repeat(gap))
        .trimEnd(),
    );
  }
};
