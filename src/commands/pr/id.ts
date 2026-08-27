import type { BitbucketClient } from "../../client/bitbucket-client.js";
import type { BbArgs } from "../../command.js";
import { UsageError } from "../../errors.js";
import type { RepoRef } from "../../flavor/domain.js";
import { currentBranch } from "../../git/log.js";
import { first } from "../../pagination/collect.js";

/**
 * Resolves the pull request a command acts on.
 *
 * With no argument, finds the open pull request for the current branch — the same
 * affordance `gh` has, and the reason `bb pr merge` usually needs no number.
 */
export const resolvePullRequestId = async (
  args: BbArgs,
  bb: BitbucketClient,
  repo: RepoRef,
): Promise<number> => {
  const raw = args["id"] as string | undefined;

  if (raw !== undefined && raw !== "") {
    const id = Number.parseInt(raw, 10);
    if (!Number.isFinite(id)) {
      throw new UsageError(`Expected a pull-request number, got ${JSON.stringify(raw)}`);
    }
    return id;
  }

  const branch = await currentBranch();
  if (branch === undefined) {
    throw new UsageError(
      "No pull request given and HEAD is detached.",
      "Pass a pull-request number.",
    );
  }

  const match = await first(
    bb.pullRequests.list({ ...repo, state: ["open"], sourceBranch: branch, limit: 1 }),
  );
  if (match === undefined) {
    throw new UsageError(
      `No open pull request found for branch ${JSON.stringify(branch)}.`,
      "Pass a pull-request number explicitly.",
    );
  }
  return match.id;
};
