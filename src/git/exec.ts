import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { GitError } from "../http/errors.js";

const execFileAsync = promisify(execFile);

export type GitOptions = {
  cwd?: string | undefined;
  timeoutMs?: number | undefined;
  signal?: AbortSignal | undefined;
};

/**
 * Runs git via `execFile`, never `exec`, and never through a shell.
 *
 * Git permits `$()`, backticks, `;` and `|` inside ref names, so a crafted repository
 * could execute arbitrary commands if any of this went through a shell.
 *
 * `--no-optional-locks` keeps `bb` from contending with a concurrent `git status`.
 */
export const runGit = async (
  args: readonly string[],
  options: GitOptions = {},
): Promise<string> => {
  try {
    const { stdout } = await execFileAsync("git", ["--no-optional-locks", ...args], {
      cwd: options.cwd ?? process.cwd(),
      timeout: options.timeoutMs ?? 5000,
      maxBuffer: 32 * 1024 * 1024,
      ...(options.signal === undefined ? {} : { signal: options.signal }),
    });
    return stdout.trim();
  } catch (cause) {
    const stderr =
      typeof cause === "object" && cause !== null && "stderr" in cause
        ? String((cause as { stderr: unknown }).stderr).trim()
        : "";
    throw new GitError(stderr === "" ? `git ${args.join(" ")} failed` : stderr, { cause });
  }
};

/** For probes where failure is an expected answer, such as "is this even a repo". */
export const tryGit = async (
  args: readonly string[],
  options: GitOptions = {},
): Promise<string | undefined> => {
  try {
    return await runGit(args, options);
  } catch {
    return undefined;
  }
};
