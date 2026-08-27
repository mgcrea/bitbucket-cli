export type BitbucketRemote = {
  name: string;
  workspace: string;
  repository: string;
  protocol: "ssh" | "https";
  host: string;
  /** Any embedded credential is stripped. Safe to log. */
  url: string;
};

const isBitbucketHost = (host: string): boolean =>
  host === "bitbucket.org" || host.endsWith(".bitbucket.org");

/**
 * Rewrites scp-like syntax (`git@bitbucket.org:acme/api.git`) into something `URL` can
 * parse, so everything downstream has one code path.
 */
const toUrl = (raw: string): URL | undefined => {
  const candidate = raw.includes("://")
    ? raw
    : raw.replace(
        /^(?:([^@/]+)@)?([^:/]+):(.+)$/,
        (_match, user: string | undefined, host, path) =>
          `ssh://${user === undefined ? "" : `${user}@`}${host}/${path}`,
      );
  try {
    return new URL(candidate);
  } catch {
    return undefined;
  }
};

export const parseBitbucketRemote = (name: string, rawUrl: string): BitbucketRemote | undefined => {
  const url = toUrl(rawUrl.trim());
  if (url === undefined || !isBitbucketHost(url.hostname)) {
    return undefined;
  }

  const segments = url.pathname.split("/").filter((segment) => segment !== "");
  if (segments.length !== 2) {
    return undefined;
  }
  const [workspace, rawRepository] = segments;
  if (workspace === undefined || rawRepository === undefined) {
    return undefined;
  }

  // Never let a token from `https://x-token-auth:SECRET@…` reach the stored URL, a log
  // line, or an error message.
  url.username = "";
  url.password = "";

  return {
    name,
    workspace,
    repository: rawRepository.replace(/\.git$/, ""),
    protocol: url.protocol === "ssh:" ? "ssh" : "https",
    host: url.hostname,
    url: url.toString(),
  };
};

/** `acme/api` -> a repo ref. */
export const parseRepoSpec = (spec: string): { workspace: string; repository: string } => {
  const segments = spec.split("/").filter((segment) => segment !== "");
  const [workspace, repository] = segments;
  if (segments.length !== 2 || workspace === undefined || repository === undefined) {
    throw new TypeError(`Expected a repository as "workspace/repo", got ${JSON.stringify(spec)}`);
  }
  return { workspace, repository: repository.replace(/\.git$/, "") };
};
