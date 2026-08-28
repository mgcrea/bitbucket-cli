#!/usr/bin/env node

import { spawn } from "node:child_process";

import { runMain } from "citty";

import { expandAlias } from "../alias/expand.js";
import { resolveAuth } from "../auth/from-store.js";
import { type BitbucketClient, createBitbucketClient } from "../client/bitbucket-client.js";
import { rootCommand } from "../commands/index.js";
import { RESERVED_NAMES } from "../commands/reserved.js";
import { readConfig } from "../config/config.js";
import { reportError } from "../errors.js";
import { createDebug } from "../http/debug.js";
import { createIo } from "../output/io.js";
import { withRuntime } from "../runtime.js";
import { prepareArgv } from "./argv.js";

const debugAlias = createDebug("alias");

/**
 * Runs a `!`-prefixed alias through the user's shell and exits with its status.
 *
 * Extra arguments are passed after `--` so the shell exposes them as $1, $2, … which is
 * what makes a shell alias able to take parameters.
 */
const runShellAlias = (command: string, args: readonly string[]): Promise<never> =>
  new Promise(() => {
    const shell = process.env["SHELL"] ?? "/bin/sh";
    const child = spawn(shell, ["-c", command, "--", ...args], { stdio: "inherit" });
    child.on("exit", (code, signal) => {
      process.exit(signal !== null ? 1 : (code ?? 0));
    });
    child.on("error", (error) => {
      process.stderr.write(`error: could not run shell alias: ${error.message}\n`);
      process.exit(1);
    });
  });

const main = async (): Promise<void> => {
  const { argv: rawArgv, passthrough } = prepareArgv(process.argv.slice(2));
  const io = createIo();

  // Aliases are expanded before citty sees anything, so an alias can stand in for a
  // whole command line. Built-ins are reserved, so one can never shadow `bb pr`.
  let argv = rawArgv;
  const looksLikeCommand = rawArgv[0] !== undefined && !rawArgv[0].startsWith("-");
  if (looksLikeCommand && !RESERVED_NAMES.includes(rawArgv[0] ?? "")) {
    const aliases = (await readConfig()).aliases ?? {};
    if (Object.keys(aliases).length > 0) {
      const expansion = expandAlias(rawArgv, { aliases, reserved: RESERVED_NAMES });
      if (expansion.kind === "shell") {
        debugAlias(`shell alias -> ${expansion.command}`);
        await runShellAlias(expansion.command, expansion.args);
      } else if (expansion.kind === "args") {
        debugAlias(`expanded -> ${expansion.argv.join(" ")}`);
        argv = expansion.argv;
      }
    }
  }

  // Built lazily and memoised, so `bb --help` never reads a credential or constructs
  // an HTTP client.
  let client: Promise<BitbucketClient> | undefined;

  await withRuntime(
    {
      io,
      client: () => {
        client ??= resolveAuth().then((auth) => createBitbucketClient({ auth }));
        return client;
      },
      passthrough,
      rawArgs: argv,
    },
    () => runMain(rootCommand, { rawArgs: argv }),
  );
};

main().catch((error: unknown) => {
  reportError(error, createIo());
  process.exit(process.exitCode === undefined ? 1 : Number(process.exitCode));
});
