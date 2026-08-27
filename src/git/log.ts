import { type GitOptions, runGit, tryGit } from "./exec.js";

export type LocalCommit = {
  hash: string;
  subject: string;
  body: string;
  author: string;
  date: string;
};

/** Undefined when HEAD is detached. */
export const currentBranch = async (options?: GitOptions): Promise<string | undefined> => {
  const branch = await tryGit(["symbolic-ref", "--short", "HEAD"], options ?? {});
  return branch === "" ? undefined : branch;
};

export const mergeBase = (a: string, b: string, options?: GitOptions): Promise<string> =>
  runGit(["merge-base", a, b], options ?? {});

export const isDirty = async (options?: GitOptions): Promise<boolean> =>
  (await tryGit(["status", "--porcelain"], options ?? {})) !== "";

export const remoteHasBranch = async (
  remote: string,
  branch: string,
  options?: GitOptions,
): Promise<boolean> => {
  const output = await tryGit(["ls-remote", "--heads", remote, branch], options ?? {});
  return output !== undefined && output !== "";
};

/**
 * Field and record separators rather than newlines.
 *
 * Commit bodies contain newlines, so any line-oriented parse breaks on the first
 * multi-paragraph commit message.
 */
const FORMAT = "%H%x1f%s%x1f%b%x1f%an%x1f%aI%x1e";

export const commitsBetween = async (
  base: string,
  head: string,
  options?: GitOptions,
): Promise<LocalCommit[]> => {
  const output = await runGit(
    ["log", "--no-merges", `--format=${FORMAT}`, `${base}..${head}`],
    options ?? {},
  );

  return output
    .split("\x1e")
    .map((record) => record.trim())
    .filter((record) => record !== "")
    .map((record) => {
      const [hash = "", subject = "", body = "", author = "", date = ""] = record.split("\x1f");
      return { hash, subject, body: body.trim(), author, date };
    });
};
