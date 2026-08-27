import type {
  BranchRef,
  PullRequest,
  PullRequestState,
  PullRequestSummary,
  ReviewDecision,
  Reviewer,
} from "../../flavor/domain.js";
import { normalizeUser } from "./user.js";

type RawBranch = {
  branch?: { name?: string };
  repository?: { full_name?: string };
  commit?: { hash?: string };
};

type RawParticipant = {
  user?: unknown;
  approved?: boolean;
  state?: string | null;
  role?: string;
};

type RawPullRequest = {
  id?: number;
  title?: string;
  description?: string;
  state?: string;
  draft?: boolean;
  close_source_branch?: boolean;
  comment_count?: number;
  task_count?: number;
  created_on?: string;
  updated_on?: string;
  reason?: string;
  author?: unknown;
  closed_by?: unknown;
  source?: RawBranch;
  destination?: RawBranch;
  merge_commit?: { hash?: string; message?: string };
  participants?: RawParticipant[];
  reviewers?: unknown[];
  links?: { html?: { href?: string } };
};

const STATES: Record<string, PullRequestState> = {
  OPEN: "open",
  MERGED: "merged",
  DECLINED: "declined",
  SUPERSEDED: "superseded",
};

/** Cloud sends screaming case; the domain is lowercase so `--state open` maps directly. */
export const normalizeState = (raw: string | undefined): PullRequestState =>
  STATES[(raw ?? "").toUpperCase()] ?? "open";

export const toWireState = (state: PullRequestState): string => state.toUpperCase();

const normalizeBranch = (raw: RawBranch | undefined): BranchRef => ({
  name: raw?.branch?.name ?? "",
  repository: raw?.repository?.full_name,
  commit: raw?.commit?.hash,
});

const normalizeDecision = (participant: RawParticipant): ReviewDecision => {
  if (participant.approved === true || participant.state === "approved") {
    return "approved";
  }
  return participant.state === "changes_requested" ? "changes-requested" : "none";
};

export const normalizePullRequestSummary = (raw: unknown): PullRequestSummary => {
  const pr = (raw ?? {}) as RawPullRequest;
  return {
    id: pr.id ?? 0,
    title: pr.title ?? "",
    state: normalizeState(pr.state),
    author: normalizeUser(pr.author),
    source: normalizeBranch(pr.source),
    destination: normalizeBranch(pr.destination),
    createdAt: pr.created_on ?? "",
    updatedAt: pr.updated_on ?? "",
    url: pr.links?.html?.href ?? "",
    draft: pr.draft ?? false,
    closeSourceBranch: pr.close_source_branch ?? false,
    commentCount: pr.comment_count,
    taskCount: pr.task_count,
  };
};

export const normalizePullRequest = (raw: unknown): PullRequest => {
  const pr = (raw ?? {}) as RawPullRequest;
  const participants = pr.participants ?? [];
  const reviewers: Reviewer[] = participants.map((participant) => ({
    user: normalizeUser(participant.user),
    decision: normalizeDecision(participant),
    role: participant.role === "REVIEWER" ? "reviewer" : "participant",
  }));

  return {
    ...normalizePullRequestSummary(raw),
    description: pr.description ?? "",
    reviewers,
    mergeCommit:
      pr.merge_commit?.hash === undefined
        ? undefined
        : { hash: pr.merge_commit.hash, message: pr.merge_commit.message },
    closedBy: pr.closed_by === undefined ? undefined : normalizeUser(pr.closed_by),
    reason: pr.reason,
    raw,
  };
};
