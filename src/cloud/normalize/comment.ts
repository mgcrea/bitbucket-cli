import type { PullRequestComment } from "../../flavor/domain.js";
import { normalizeUser } from "./user.js";

type RawComment = {
  id?: number;
  content?: { raw?: string };
  user?: unknown;
  created_on?: string;
  deleted?: boolean;
  parent?: { id?: number };
  inline?: { path?: string; from?: number | null; to?: number | null };
};

export const normalizeComment = (raw: unknown): PullRequestComment => {
  const comment = (raw ?? {}) as RawComment;
  return {
    id: comment.id ?? 0,
    content: comment.content?.raw ?? "",
    author: normalizeUser(comment.user),
    createdAt: comment.created_on ?? "",
    inline:
      comment.inline?.path === undefined
        ? undefined
        : {
            path: comment.inline.path,
            from: comment.inline.from ?? undefined,
            to: comment.inline.to ?? undefined,
          },
    parentId: comment.parent?.id,
    deleted: comment.deleted ?? false,
  };
};
