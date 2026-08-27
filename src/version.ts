/**
 * Replaced at build time by tsdown's `define`. The fallback keeps `tsx src/bin/cli.ts`
 * working in development, where no substitution happens.
 */
declare const __BB_VERSION__: string | undefined;

export const VERSION = typeof __BB_VERSION__ === "string" ? __BB_VERSION__ : "0.0.0-dev";
