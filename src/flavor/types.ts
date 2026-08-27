import type { AuthStrategy } from "../auth/types.js";
import type { FieldPreset } from "../fields/presets.js";
import type { FieldProjection } from "../fields/projection.js";
import type { PaginateOptions } from "../pagination/paginate.js";
import type {
  CommitStatus,
  CommitSummary,
  Identity,
  MergeOutcome,
  MergeStrategy,
  PullRequest,
  PullRequestRef,
  PullRequestState,
  PullRequestSummary,
  RepoRef,
  Repository,
  RepositorySummary,
  ReviewDecision,
  UserRef,
  WorkspaceSummary,
} from "./domain.js";

export type FlavorCapabilities = {
  readonly pipelines: boolean;
  /** Cloud has `q=` BBQL. Data Center has per-endpoint params instead. */
  readonly serverSideQuery: boolean;
  /** Cloud has `fields=`. Data Center has no equivalent. */
  readonly fieldProjection: boolean;
  /** Data Center pull-request mutations carry an optimistic-lock version. */
  readonly optimisticLocking: boolean;
};

export type FieldsOption = FieldPreset | FieldProjection;

export type ListPullRequestsOptions = RepoRef &
  PaginateOptions & {
    state?: readonly PullRequestState[] | undefined;
    author?: string | undefined;
    reviewer?: string | undefined;
    sourceBranch?: string | undefined;
    destinationBranch?: string | undefined;
    /** Free text. Cloud turns this into a `title ~ "..."` clause. */
    search?: string | undefined;
    /** Raw BBQL. Rejected by a flavor without `serverSideQuery`. */
    query?: string | undefined;
    /** Bitbucket accepts exactly one sort field; `-` prefixes descending. */
    sort?: string | undefined;
    fields?: FieldsOption | undefined;
  };

export type CreatePullRequestInput = {
  title: string;
  description?: string | undefined;
  sourceBranch: string;
  /** For a cross-fork pull request, the source repo as `workspace/slug`. */
  sourceRepository?: string | undefined;
  destinationBranch?: string | undefined;
  reviewers?: readonly string[] | undefined;
  closeSourceBranch?: boolean | undefined;
  draft?: boolean | undefined;
};

export type UpdatePullRequestInput = {
  title?: string | undefined;
  description?: string | undefined;
  destinationBranch?: string | undefined;
  reviewers?: readonly string[] | undefined;
  draft?: boolean | undefined;
};

export type MergePullRequestInput = {
  strategy?: MergeStrategy | undefined;
  message?: string | undefined;
  closeSourceBranch?: boolean | undefined;
  /** Poll an async merge to completion instead of returning a pending outcome. */
  wait?: boolean | undefined;
  signal?: AbortSignal | undefined;
};

export type PullRequestsResource = {
  list(options: ListPullRequestsOptions): AsyncIterable<PullRequestSummary>;
  get(ref: PullRequestRef, options?: { fields?: FieldsOption | undefined }): Promise<PullRequest>;
  create(target: RepoRef, input: CreatePullRequestInput): Promise<PullRequest>;
  update(ref: PullRequestRef, input: UpdatePullRequestInput): Promise<PullRequest>;
  merge(ref: PullRequestRef, input?: MergePullRequestInput): Promise<MergeOutcome>;
  decline(ref: PullRequestRef): Promise<PullRequest>;
  /**
   * Expressed as an intent rather than an endpoint.
   *
   * Cloud spreads this across four endpoints (POST/DELETE on `/approve` and
   * `/request-changes`); Data Center has a single participant PUT carrying a status.
   * A URL-level abstraction could not express both, which is the concrete reason this
   * interface sits at the resource level.
   */
  setReview(ref: PullRequestRef, decision: ReviewDecision): Promise<void>;
  commits(ref: PullRequestRef, options?: PaginateOptions): AsyncIterable<CommitSummary>;
  statuses(ref: PullRequestRef, options?: PaginateOptions): AsyncIterable<CommitStatus>;
  diff(ref: PullRequestRef): Promise<string>;
  patch(ref: PullRequestRef): Promise<string>;
};

export type ListRepositoriesOptions = PaginateOptions & {
  /**
   * Required, not optional. Listing repositories across all workspaces was removed by
   * Atlassian and now returns HTTP 410, so this makes that a compile error rather than
   * a runtime surprise.
   */
  workspace: string;
  role?: "owner" | "admin" | "contributor" | "member" | undefined;
  query?: string | undefined;
  sort?: string | undefined;
  fields?: FieldsOption | undefined;
};

export type CreateRepositoryInput = RepoRef & {
  isPrivate?: boolean | undefined;
  description?: string | undefined;
  project?: string | undefined;
  forkPolicy?: string | undefined;
  language?: string | undefined;
};

export type RepositoriesResource = {
  list(options: ListRepositoriesOptions): AsyncIterable<RepositorySummary>;
  get(ref: RepoRef, options?: { fields?: FieldsOption | undefined }): Promise<Repository>;
  create(input: CreateRepositoryInput): Promise<Repository>;
  delete(ref: RepoRef): Promise<void>;
  defaultBranch(ref: RepoRef): Promise<string>;
};

export type WorkspacesResource = {
  list(options?: PaginateOptions): AsyncIterable<WorkspaceSummary>;
};

export type UsersResource = {
  /** Throws `CapabilityError` without a request when the credential has no identity. */
  current(): Promise<UserRef>;
  /** Never throws on a credential limitation; degrades to a described identity. */
  whoami(): Promise<Identity>;
};

export type Flavor = {
  readonly id: "cloud" | "datacenter";
  readonly capabilities: FlavorCapabilities;
  readonly auth: AuthStrategy;
  readonly pullRequests: PullRequestsResource;
  readonly repositories: RepositoriesResource;
  readonly users: UsersResource;
  readonly workspaces: WorkspacesResource;
};
