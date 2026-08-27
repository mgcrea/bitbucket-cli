import { AsyncLocalStorage } from "node:async_hooks";

import type { BitbucketClient } from "./client/bitbucket-client.js";
import type { Io } from "./output/io.js";

export type Runtime = {
  io: Io;
  /** Constructed lazily so `bb --help` never builds a client or reads credentials. */
  client: () => BitbucketClient;
  /** Everything after the first literal `--`, which citty would otherwise flatten. */
  passthrough: readonly string[];
};

const storage = new AsyncLocalStorage<Runtime>();

/**
 * AsyncLocalStorage rather than citty's `data`, so the same mechanism serves built-in
 * commands, npm extensions and nested invocations without coupling to citty.
 */
export const withRuntime = <T>(runtime: Runtime, run: () => T): T => storage.run(runtime, run);

export const getRuntime = (): Runtime => {
  const runtime = storage.getStore();
  if (runtime === undefined) {
    throw new Error("No runtime in scope. Commands must run inside withRuntime().");
  }
  return runtime;
};
