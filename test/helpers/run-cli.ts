import { runCommand } from "citty";

import { createApiTokenAuth } from "../../src/auth/api-token.js";
import { prepareArgv } from "../../src/bin/argv.js";
import { createBitbucketClient } from "../../src/client/bitbucket-client.js";
import { rootCommand } from "../../src/commands/index.js";
import { createFakeIo, type Io } from "../../src/output/io.js";
import { withRuntime } from "../../src/runtime.js";

export type RunCliResult = {
  stdout: string;
  stderr: string;
  /** `process.exitCode` after the run; 0 when the command set none. */
  exitCode: number;
};

export type RunCliOptions = {
  /** Overrides on the fake Io, most usefully `isTTY` and `width`. */
  io?: Partial<Io> | undefined;
};

/**
 * Runs a command in-process with everything injected.
 *
 * Deliberately not a subprocess: the fake `Io` makes TTY-ness a plain field rather than
 * something that needs a real terminal, which is what lets the same command be asserted
 * in both its table and its piped form. HTTP still goes through MSW, so URL and body
 * construction stay covered.
 */
export const runCli = async (
  argv: readonly string[],
  options: RunCliOptions = {},
): Promise<RunCliResult> => {
  const io = createFakeIo(options.io ?? {});
  const previousExitCode = process.exitCode;
  process.exitCode = undefined;

  const { argv: prepared, passthrough } = prepareArgv(argv);

  try {
    await withRuntime(
      {
        io,
        client: () =>
          Promise.resolve(
            createBitbucketClient({
              auth: createApiTokenAuth({ token: "test-token", email: "test@example.com" }),
              // No backoff: a retry test would otherwise sit in real time.
              retry: { baseDelayMs: 1, maxDelayMs: 2 },
            }),
          ),
        passthrough,
        rawArgs: prepared,
      },
      () => runCommand(rootCommand, { rawArgs: [...prepared] }),
    );
    return { stdout: io.stdout, stderr: io.stderr, exitCode: Number(process.exitCode ?? 0) };
  } finally {
    process.exitCode = previousExitCode;
  }
};
