/**
 * Lazy loader for @clack/prompts.
 *
 * Two reasons this indirection exists. First, clack is only needed on an interactive
 * path, so non-interactive runs (every CI run) should not pay to load it. Second,
 * clack is ESM-only while our bin is CJS: going through `new Function` keeps the
 * specifier opaque to the bundler so it emits a real dynamic `import()` rather than a
 * `require()`, which is what makes `require(esm)` interop work on Node 22.12+.
 */

import type * as Clack from "@clack/prompts";

const dynamicImport = new Function("specifier", "return import(specifier)") as (
  specifier: string,
) => Promise<unknown>;

export type ClackModule = typeof Clack;

let cached: Promise<ClackModule> | undefined;

export const loadClack = (): Promise<ClackModule> => {
  cached ??= dynamicImport("@clack/prompts") as Promise<ClackModule>;
  return cached;
};
