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

export const PIPELINES = (workspace: string, repository: string): string =>
  `${REPOSITORY(workspace, repository)}/pipelines`;

export const PIPELINE = (workspace: string, repository: string, selector: string): string =>
  `${PIPELINES(workspace, repository)}/${enc(selector)}`;

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
