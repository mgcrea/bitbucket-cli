/**
 * @packageDocumentation
 * A typed Bitbucket Cloud client.
 *
 * This package also ships the `bb` CLI, which is a process rather than a module and is
 * reachable only through its `bin` entry.
 *
 * @example
 * ```ts
 * import { createBitbucketClient } from "@mgcrea/bitbucket-cli";
 *
 * const bb = createBitbucketClient();
 * for await (const pr of bb.pullRequests.list({ workspace: "acme", repository: "api", limit: 20 })) {
 *   console.log(pr.id, pr.title);
 * }
 * ```
 */

// Client
export { createBitbucketClient } from "./client/bitbucket-client.js";
export type { BitbucketClient, ClientOptions } from "./client/bitbucket-client.js";

// Domain types
export type {
  BranchRef,
  CommitRef,
  CommitStatus,
  CommitStatusState,
  CommitSummary,
  ForkPolicy,
  Identity,
  MergeOutcome,
  MergeStrategy,
  PollOptions,
  PullRequest,
  PullRequestRef,
  PullRequestState,
  PullRequestSummary,
  RepoRef,
  Repository,
  RepositorySummary,
  ReviewDecision,
  Reviewer,
  RevisionToken,
  UserRef,
} from "./flavor/domain.js";

// The flavor seam, for a future Data Center implementation
export type {
  CreatePullRequestInput,
  CreateRepositoryInput,
  Flavor,
  FlavorCapabilities,
  ListPullRequestsOptions,
  ListRepositoriesOptions,
  MergePullRequestInput,
  PullRequestsResource,
  RepositoriesResource,
  UpdatePullRequestInput,
  UsersResource,
} from "./flavor/types.js";

// Auth
export {
  createAccessTokenAuth,
  createAnonymousAuth,
  createApiTokenAuth,
  resolveAuthFromEnv,
} from "./auth/index.js";
export type {
  AuthCapabilities,
  AuthKind,
  AuthScope,
  AuthStrategy,
  GitCredentials,
} from "./auth/index.js";

// Errors
export {
  AuthenticationError,
  AuthorizationError,
  BitbucketApiError,
  BitbucketError,
  CapabilityError,
  ConflictError,
  describeError,
  GoneError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  ResponseParseError,
  ServerError,
  TimeoutError,
  ValidationError,
} from "./http/errors.js";
export type { BitbucketErrorKind } from "./http/errors.js";

// HTTP surface, for the `bb api` escape hatch and for embedders
export { HttpClient } from "./http/http-client.js";
export type { HttpClientOptions, RequestEvent, ResponseEvent } from "./http/http-client.js";
export type { RequestSpec, QueryInit } from "./http/request.js";
export type { RateLimitSnapshot } from "./http/rate-limit.js";

// Pagination
export { collect, first } from "./pagination/collect.js";
export type { Page, PageMeta, PaginateOptions } from "./pagination/paginate.js";

// Field projection — the server-side `fields=` lever
export { buildFields, forCollection } from "./fields/projection.js";
export type { FieldProjection, FieldTerm } from "./fields/projection.js";
export { PULL_REQUEST_FIELDS, REPOSITORY_FIELDS } from "./fields/presets.js";
export type { FieldPreset } from "./fields/presets.js";

// BBQL query building
export { and, contains, eq, inList, quoteBbql } from "./query/bbql.js";

// Git context inference and the reads behind `pr create --fill`
export {
  buildPullRequestDraft,
  commitsBetween,
  currentBranch,
  isDirty,
  listBitbucketRemotes,
  mergeBase,
  parseBitbucketRemote,
  parseRepoSpec,
  remoteHasBranch,
  resolveRepoContext,
} from "./git/index.js";
export type {
  BitbucketRemote,
  LocalCommit,
  PullRequestDraft,
  RepoContext,
  ResolveRepoContextOptions,
} from "./git/index.js";
