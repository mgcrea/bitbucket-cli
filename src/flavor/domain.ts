/**
 * Normalized domain types.
 *
 * These are hand-written rather than derived from the generated schemas, which are
 * `allOf` compositions with `additionalProperties: true` and almost every field
 * optional. Raw Cloud payloads never escape `src/cloud/` except through the explicit
 * `raw` escape hatch on full objects.
 */

export type RepoRef = { workspace: string; repository: string };
export type PullRequestRef = RepoRef & { id: number };

/**
 * An opaque concurrency token.
 *
 * Bitbucket Cloud has no such concept, but Data Center requires a `version` integer on
 * every pull-request mutation and rejects the request without it. Carrying a branded,
 * flavor-private slot on the domain object now means a DC implementation does not have
 * to re-read the pull request before every write. Cloud leaves it undefined.
 */
export type RevisionToken = string & { readonly __brand: "RevisionToken" };

export type UserRef = {
  /** Bitbucket's stable identifier. Prefer this: filtering by username is deprecated. */
  uuid?: string | undefined;
  accountId?: string | undefined;
  displayName: string;
  nickname?: string | undefined;
};

export type BranchRef = {
  name: string;
  /** Absent when the pull request comes from a fork whose repo was removed. */
  repository?: string | undefined;
  commit?: string | undefined;
};

export type CommitRef = { hash: string; message?: string | undefined };

export type CommitSummary = {
  hash: string;
  message: string;
  author: UserRef;
  date: string;
};

/** Lowercased on the way in, re-uppercased on the wire. `--state open` then just works. */
export type PullRequestState = "open" | "merged" | "declined" | "superseded";

export type ReviewDecision = "approved" | "changes-requested" | "none";

export type Reviewer = {
  user: UserRef;
  decision: ReviewDecision;
  role: "reviewer" | "participant";
};

export type PullRequestSummary = {
  id: number;
  title: string;
  state: PullRequestState;
  author: UserRef;
  source: BranchRef;
  destination: BranchRef;
  createdAt: string;
  updatedAt: string;
  url: string;
  draft: boolean;
  closeSourceBranch: boolean;
  commentCount?: number | undefined;
  taskCount?: number | undefined;
  revision?: RevisionToken | undefined;
};

/**
 * The full object, as returned by `get()`.
 *
 * The split from `PullRequestSummary` is deliberate: `list()` uses a narrower `fields=`
 * projection and genuinely cannot populate `description` or `reviewers`. Encoding that
 * in the types at the boundary is cheaper and more honest than trying to infer a
 * response shape from a projection string.
 */
export type PullRequest = PullRequestSummary & {
  description: string;
  reviewers: readonly Reviewer[];
  mergeCommit?: CommitRef | undefined;
  closedBy?: UserRef | undefined;
  reason?: string | undefined;
  /** The untouched flavor payload. Never typed as the domain shape. */
  raw?: unknown;
};

export type ForkPolicy = "allow_forks" | "no_public_forks" | "no_forks";

export type RepositorySummary = {
  workspace: string;
  slug: string;
  fullName: string;
  uuid?: string | undefined;
  isPrivate: boolean;
  description?: string | undefined;
  language?: string | undefined;
  mainBranch?: string | undefined;
  updatedAt?: string | undefined;
  url: string;
};

export type Repository = RepositorySummary & {
  createdAt?: string | undefined;
  size?: number | undefined;
  forkPolicy?: ForkPolicy | undefined;
  project?: { key: string; name?: string | undefined } | undefined;
  cloneUrls: { https?: string | undefined; ssh?: string | undefined };
  raw?: unknown;
};

export type MergeStrategy =
  | "merge-commit"
  | "squash"
  | "fast-forward"
  | "squash-fast-forward"
  | "rebase-fast-forward"
  | "rebase-merge";

/**
 * A merge is either done or still running.
 *
 * Bitbucket answers a merge with 200 and the merged pull request, or 202 and a task to
 * poll. Modelling that as `Promise<PullRequest>` would silently block a CLI for minutes
 * on the async path, so the split is surfaced.
 */
export type MergeOutcome =
  | { status: "merged"; pullRequest: PullRequest }
  | { status: "pending"; taskUrl: string; poll: (options?: PollOptions) => Promise<PullRequest> };

export type PollOptions = {
  intervalMs?: number | undefined;
  timeoutMs?: number | undefined;
  signal?: AbortSignal | undefined;
  onPoll?: ((attempt: number) => void) | undefined;
};

export type CommitStatusState = "SUCCESSFUL" | "FAILED" | "INPROGRESS" | "STOPPED";

export type CommitStatus = {
  key: string;
  name?: string | undefined;
  state: CommitStatusState;
  url?: string | undefined;
  description?: string | undefined;
  updatedAt?: string | undefined;
};

export type Identity =
  | { kind: "user"; user: UserRef }
  | { kind: "anonymous" }
  /** Authenticated, but with a credential that has no associated account. */
  | { kind: "token"; reason: "no-user-identity" };
