import { styleText } from "node:util";

export type Style = Parameters<typeof styleText>[0];

/**
 * All colouring goes through here so a single boolean governs it.
 *
 * `node:util.styleText` already honours `NO_COLOR`, `FORCE_COLOR` and TTY detection,
 * which is why there is no colour dependency. But it decides per stream, and we may be
 * writing into a pager pipe while still wanting colour — so the decision is made once
 * in `Io` and forced here with `validateStream: false`.
 */
export const createColorizer =
  (enabled: boolean) =>
  (style: Style, value: string): string =>
    enabled ? styleText(style, value, { validateStream: false }) : value;

export type Colorize = ReturnType<typeof createColorizer>;
