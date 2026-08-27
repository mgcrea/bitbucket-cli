#!/usr/bin/env node

import { runMain } from "citty";

import { createBitbucketClient } from "../client/bitbucket-client.js";
import { rootCommand } from "../commands/index.js";
import { reportError } from "../errors.js";
import { createIo } from "../output/io.js";
import { withRuntime } from "../runtime.js";
import { prepareArgv } from "./argv.js";

const main = async (): Promise<void> => {
  const { argv, passthrough } = prepareArgv(process.argv.slice(2));
  const io = createIo();

  // Built lazily and memoised, so `bb --help` never reads a credential or constructs
  // an HTTP client.
  let client: ReturnType<typeof createBitbucketClient> | undefined;

  await withRuntime(
    {
      io,
      client: () => {
        client ??= createBitbucketClient();
        return client;
      },
      passthrough,
    },
    () => runMain(rootCommand, { rawArgs: argv }),
  );
};

main().catch((error: unknown) => {
  reportError(error, createIo());
  process.exit(process.exitCode === undefined ? 1 : Number(process.exitCode));
});
