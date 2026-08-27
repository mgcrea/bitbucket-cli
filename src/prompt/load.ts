import type * as Clack from "@clack/prompts";

import { lazyImport } from "../output/lazy.js";

/**
 * Lazy loader for @clack/prompts.
 *
 * Loaded only when a prompt is about to be shown, so non-interactive runs — every CI
 * run — never pay for it. It is also ESM-only while our bin is CJS, which is the other
 * reason it goes through `lazyImport` rather than a plain import.
 */
export type ClackModule = typeof Clack;

let cached: Promise<ClackModule> | undefined;

export const loadClack = (): Promise<ClackModule> => {
  cached ??= lazyImport("@clack/prompts") as Promise<ClackModule>;
  return cached;
};
