/**
 * Every Bitbucket Cloud path template, in one place.
 *
 * Centralised mainly so the inconsistent spellings below are pinned down once and
 * covered by a spec, rather than being "corrected" by a well-meaning refactor.
 */

const enc = (value: string | number): string => encodeURIComponent(String(value));

export const USER = "/user";
/**
 * The only remaining way to discover which workspaces a token can reach.
 *
 * `GET /workspaces` and the cross-workspace `GET /repositories` were both removed under
 * CHANGE-2770, and `/user/permissions/workspaces` does not exist. Since every
 * repository listing is workspace-scoped, this endpoint is a prerequisite for using the
 * API at all.
 */
export const USER_WORKSPACES = "/user/workspaces";

export const REPOSITORIES = (workspace: string): string => `/repositories/${enc(workspace)}`;

export const REPOSITORY = (workspace: string, repository: string): string =>
  `/repositories/${enc(workspace)}/${enc(repository)}`;

export const PULL_REQUESTS = (workspace: string, repository: string): string =>
  `${REPOSITORY(workspace, repository)}/pullrequests`;

export const PULL_REQUEST = (workspace: string, repository: string, id: number): string =>
  `${PULL_REQUESTS(workspace, repository)}/${enc(id)}`;

export const PULL_REQUEST_MERGE = (workspace: string, repository: string, id: number): string =>
  `${PULL_REQUEST(workspace, repository, id)}/merge`;

export const PULL_REQUEST_DECLINE = (workspace: string, repository: string, id: number): string =>
  `${PULL_REQUEST(workspace, repository, id)}/decline`;

export const PULL_REQUEST_APPROVE = (workspace: string, repository: string, id: number): string =>
  `${PULL_REQUEST(workspace, repository, id)}/approve`;

export const PULL_REQUEST_REQUEST_CHANGES = (
  workspace: string,
  repository: string,
  id: number,
): string => `${PULL_REQUEST(workspace, repository, id)}/request-changes`;

export const PULL_REQUEST_COMMITS = (workspace: string, repository: string, id: number): string =>
  `${PULL_REQUEST(workspace, repository, id)}/commits`;

export const PULL_REQUEST_STATUSES = (workspace: string, repository: string, id: number): string =>
  `${PULL_REQUEST(workspace, repository, id)}/statuses`;

export const PULL_REQUEST_DIFF = (workspace: string, repository: string, id: number): string =>
  `${PULL_REQUEST(workspace, repository, id)}/diff`;

export const PULL_REQUEST_PATCH = (workspace: string, repository: string, id: number): string =>
  `${PULL_REQUEST(workspace, repository, id)}/patch`;

export const PULL_REQUEST_COMMENTS = (workspace: string, repository: string, id: number): string =>
  `${PULL_REQUEST(workspace, repository, id)}/comments`;

export const PIPELINES = (workspace: string, repository: string): string =>
  `${REPOSITORY(workspace, repository)}/pipelines`;

export const PIPELINE = (workspace: string, repository: string, selector: string): string =>
  `${PIPELINES(workspace, repository)}/${enc(selector)}`;

export const PIPELINE_STOP = (workspace: string, repository: string, uuid: string): string =>
  `${PIPELINE(workspace, repository, uuid)}/stopPipeline`;

export const PIPELINE_STEPS = (workspace: string, repository: string, uuid: string): string =>
  `${PIPELINE(workspace, repository, uuid)}/steps`;

export const PIPELINE_STEP_LOG = (
  workspace: string,
  repository: string,
  uuid: string,
  stepUuid: string,
): string => `${PIPELINE_STEPS(workspace, repository, uuid)}/${enc(stepUuid)}/log`;

/**
 * The next three are not typos.
 *
 * Bitbucket shipped `pipelines_config` for repository-scoped pipeline variables and
 * `pipelines-config` — with a hyphen — for workspace-scoped ones, and
 * `deployments_config` for deployment variables. Using the wrong spelling 404s.
 */
export const REPO_PIPELINE_VARIABLES = (workspace: string, repository: string): string =>
  `${REPOSITORY(workspace, repository)}/pipelines_config/variables`;

export const WORKSPACE_PIPELINE_VARIABLES = (workspace: string): string =>
  `/workspaces/${enc(workspace)}/pipelines-config/variables`;

export const DEPLOYMENT_VARIABLES = (
  workspace: string,
  repository: string,
  environmentUuid: string,
): string =>
  `${REPOSITORY(workspace, repository)}/deployments_config/environments/${enc(environmentUuid)}/variables`;

// ---- Commits, refs and file contents ---------------------------------------------
//
// Read-only endpoints, added so a caller can review code rather than only pull
// requests. Two spelling traps live in this block and are pinned by the spec.

/**
 * Encode a multi-segment path without destroying its separators.
 *
 * `enc()` is `encodeURIComponent`, which turns `/` into `%2F` — correct for a single
 * segment and wrong for a file path, where Bitbucket expects real separators. A file
 * called `src/a b.ts` has to arrive as `src/a%20b.ts`, not `src%2Fa%20b.ts`.
 */
const encPath = (value: string): string => value.split("/").map(enc).join("/");

/**
 * The commit list is `/commits` and a single commit is `/commit` — plural for the
 * collection, singular for the item. This is not a typo and it is not symmetrical with
 * anything else in this file; the other resources use the plural for both. Getting it
 * backwards 404s.
 */
export const REPO_COMMITS = (workspace: string, repository: string, revision?: string): string =>
  revision === undefined
    ? `${REPOSITORY(workspace, repository)}/commits`
    : `${REPOSITORY(workspace, repository)}/commits/${enc(revision)}`;

export const COMMIT = (workspace: string, repository: string, sha: string): string =>
  `${REPOSITORY(workspace, repository)}/commit/${enc(sha)}`;

export const COMMIT_STATUSES = (workspace: string, repository: string, sha: string): string =>
  `${COMMIT(workspace, repository, sha)}/statuses`;

/**
 * Diffs hang off the repository, not off the commit.
 *
 * `spec` is a revision or a `to..from` range — note Bitbucket's order is
 * destination-first, the reverse of `git diff`. The `..` must survive encoding, which
 * `encodeURIComponent` leaves alone.
 */
export const DIFF = (workspace: string, repository: string, spec: string): string =>
  `${REPOSITORY(workspace, repository)}/diff/${enc(spec)}`;

export const DIFFSTAT = (workspace: string, repository: string, spec: string): string =>
  `${REPOSITORY(workspace, repository)}/diffstat/${enc(spec)}`;

export const REPO_REFS_BRANCHES = (workspace: string, repository: string): string =>
  `${REPOSITORY(workspace, repository)}/refs/branches`;

export const REPO_REFS_TAGS = (workspace: string, repository: string): string =>
  `${REPOSITORY(workspace, repository)}/refs/tags`;

/**
 * File contents, or a directory listing, at a revision.
 *
 * One endpoint with two entirely different response shapes: a file comes back as raw
 * bytes, a directory as a paginated JSON envelope of entries. Callers must know which
 * they asked for — there is no discriminator in the response itself.
 *
 * Prefer a commit sha for `ref`. A branch name containing a slash (`feature/x`) is
 * genuinely ambiguous here, because the ref and the path share one slash-separated
 * space and the server splits them by resolving the longest ref it recognises.
 *
 * Omitting `ref` entirely redirects to the main branch's latest commit, which is why
 * this returns the bare `/src` in that case rather than guessing a default.
 */
export const REPO_SRC = (
  workspace: string,
  repository: string,
  ref?: string,
  path?: string,
): string => {
  const base = `${REPOSITORY(workspace, repository)}/src`;
  if (ref === undefined) {
    return base;
  }
  const withRef = `${base}/${enc(ref)}`;
  return path === undefined || path === "" ? `${withRef}/` : `${withRef}/${encPath(path)}`;
};

export const WORKSPACE = (workspace: string): string => `/workspaces/${enc(workspace)}`;

export const WORKSPACE_PROJECTS = (workspace: string): string => `${WORKSPACE(workspace)}/projects`;

export const WORKSPACE_PROJECT = (workspace: string, projectKey: string): string =>
  `${WORKSPACE_PROJECTS(workspace)}/${enc(projectKey)}`;
