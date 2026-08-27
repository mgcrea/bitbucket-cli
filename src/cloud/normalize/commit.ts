import type { CommitStatus, CommitStatusState, CommitSummary } from "../../flavor/domain.js";
import { normalizeUser } from "./user.js";

type RawCommit = {
  hash?: string;
  message?: string;
  date?: string;
  author?: { user?: unknown; raw?: string };
};

export const normalizeCommit = (raw: unknown): CommitSummary => {
  const commit = (raw ?? {}) as RawCommit;
  return {
    hash: commit.hash ?? "",
    message: commit.message ?? "",
    author: normalizeUser(commit.author?.user),
    date: commit.date ?? "",
  };
};

type RawStatus = {
  key?: string;
  name?: string;
  state?: string;
  url?: string;
  description?: string;
  updated_on?: string;
};

const STATES = new Set<string>(["SUCCESSFUL", "FAILED", "INPROGRESS", "STOPPED"]);

export const normalizeCommitStatus = (raw: unknown): CommitStatus => {
  const status = (raw ?? {}) as RawStatus;
  const state = (status.state ?? "").toUpperCase() as CommitStatusState;
  return {
    key: status.key ?? "",
    name: status.name,
    state: STATES.has(state) ? state : "INPROGRESS",
    url: status.url,
    description: status.description,
    updatedAt: status.updated_on,
  };
};
