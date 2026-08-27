import { RepoContextError } from "../http/errors.js";
import { type GitOptions, tryGit } from "./exec.js";
import { type BitbucketRemote, parseBitbucketRemote, parseRepoSpec } from "./remote.js";

export type RepoContext = {
  workspace: string;
  repository: string;
  source: "flag" | "env" | "config" | "remote";
  remote?: BitbucketRemote | undefined;
};

export type ResolveRepoContextOptions = GitOptions & {
  /** `--repo acme/api`. Wins over everything. */
  override?: string | undefined;
  /** Preferred remote names, most-preferred first. */
  remotes?: readonly string[] | undefined;
};

const DEFAULT_REMOTE_ORDER = ["upstream", "bitbucket", "origin"] as const;

/**
 * Reads remotes via `git config` rather than `git remote -v`, which lists every remote
 * twice (fetch and push) and is fiddlier to parse.
 */
export const listBitbucketRemotes = async (
  options: GitOptions = {},
): Promise<BitbucketRemote[]> => {
  const output = await tryGit(["config", "--get-regexp", String.raw`^remote\..*\.url`], options);
  if (output === undefined || output === "") {
    return [];
  }

  const remotes: BitbucketRemote[] = [];
  for (const line of output.split("\n")) {
    const separator = line.indexOf(" ");
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator);
    const url = line.slice(separator + 1);
    const name = /^remote\.(.+)\.url$/.exec(key)?.[1];
    if (name === undefined) {
      continue;
    }
    const remote = parseBitbucketRemote(name, url);
    if (remote !== undefined && !remotes.some((existing) => existing.name === remote.name)) {
      remotes.push(remote);
    }
  }
  return remotes;
};

/**
 * Resolves which repository a command acts on.
 *
 * Precedence, highest first: the `--repo` flag, `BB_REPO`, a `bb.repo` git config entry,
 * then git remotes in preference order. The git-config step is a real escape hatch for
 * mirrors and unusual remote layouts.
 */
export const resolveRepoContext = async (
  options: ResolveRepoContextOptions = {},
): Promise<RepoContext> => {
  if (options.override !== undefined) {
    return { ...parseRepoSpec(options.override), source: "flag" };
  }

  const fromEnv = process.env["BB_REPO"] ?? process.env["BITBUCKET_REPO"];
  if (fromEnv !== undefined && fromEnv !== "") {
    return { ...parseRepoSpec(fromEnv), source: "env" };
  }

  const fromConfig = await tryGit(["config", "--get", "bb.repo"], options);
  if (fromConfig !== undefined && fromConfig !== "") {
    return { ...parseRepoSpec(fromConfig), source: "config" };
  }

  const remotes = await listBitbucketRemotes(options);
  if (remotes.length === 0) {
    throw new RepoContextError("No Bitbucket repository found for the current directory", {
      hint: "Run this inside a Bitbucket clone, or pass --repo workspace/repo.",
    });
  }

  const order = options.remotes ?? DEFAULT_REMOTE_ORDER;
  for (const name of order) {
    const match = remotes.find((remote) => remote.name === name);
    if (match !== undefined) {
      return {
        workspace: match.workspace,
        repository: match.repository,
        source: "remote",
        remote: match,
      };
    }
  }

  if (remotes.length === 1 && remotes[0] !== undefined) {
    const only = remotes[0];
    return {
      workspace: only.workspace,
      repository: only.repository,
      source: "remote",
      remote: only,
    };
  }

  // Guessing between several equally-plausible remotes is how a pull request ends up
  // on the wrong repository. Fail with the candidates instead.
  throw new RepoContextError(
    `Several Bitbucket remotes found (${remotes.map((remote) => remote.name).join(", ")})`,
    { hint: "Pass --repo workspace/repo, or set one with `git config bb.repo`." },
  );
};
