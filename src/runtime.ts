import { AsyncLocalStorage } from "node:async_hooks";

import type { BitbucketClient } from "./client/bitbucket-client.js";
import type { Io } from "./output/io.js";

export type Runtime = {
  io: Io;
  /**
   * Constructed lazily and memoised, so `bb --help` never reads a credential file or
   * builds an HTTP client. Async because resolving the credential touches disk.
   */
  client: () => Promise<BitbucketClient>;
  /** Everything after the first literal `--`, which citty would otherwise flatten. */
  passthrough: readonly string[];
  /**
   * argv as citty received it. Needed because citty cannot express a repeatable flag,
   * so `-f a=1 -f b=2` collapses to the last value in the parsed args.
   */
  rawArgs: readonly string[];
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
