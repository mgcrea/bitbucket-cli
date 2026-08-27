import { defineBbCommand } from "../../command.js";
import { UsageError } from "../../errors.js";
import type { MergeStrategy, PullRequest } from "../../flavor/domain.js";
import type { FieldMap } from "../../output/fields.js";
import { getRuntime } from "../../runtime.js";
import { repoFromArgs } from "../context.js";
import { resolvePullRequestId } from "./id.js";

const STRATEGIES: readonly MergeStrategy[] = [
  "merge-commit",
  "squash",
  "fast-forward",
  "squash-fast-forward",
  "rebase-fast-forward",
  "rebase-merge",
];

const FIELDS: FieldMap<PullRequest> = {
  id: { pick: (pr) => pr.id },
  title: { pick: (pr) => pr.title },
  state: { pick: (pr) => pr.state },
  mergeCommit: { pick: (pr) => pr.mergeCommit },
  url: { pick: (pr) => pr.url },
};

export default defineBbCommand<PullRequest>({
  meta: { name: "merge", description: "Merge a pull request" },
  args: {
    id: {
      type: "positional",
      description: "Pull request number (default: the current branch's)",
      required: false,
    },
    strategy: { type: "string", alias: "s", description: `One of: ${STRATEGIES.join(", ")}` },
    squash: { type: "boolean", description: "Shorthand for --strategy squash" },
    message: { type: "string", alias: "m", description: "Merge commit message" },
    "delete-branch": {
      type: "boolean",
      alias: "d",
      description: "Delete the source branch after merging",
    },
    yes: { type: "boolean", alias: "y", description: "Skip the confirmation prompt" },
  },
  fields: FIELDS,
  examples: ["bb pr merge", "bb pr merge 42 --squash --delete-branch"],
  async run({ args }) {
    const { io, client } = getRuntime();
    const bb = await client();
    const repo = await repoFromArgs(args);
    const id = await resolvePullRequestId(args, bb, repo);

    const requested = args["squash"] === true ? "squash" : (args["strategy"] as string | undefined);
    if (requested !== undefined && !STRATEGIES.includes(requested as MergeStrategy)) {
      throw new UsageError(
        `Unknown merge strategy ${JSON.stringify(requested)}.`,
        `Valid values: ${STRATEGIES.join(", ")}`,
      );
    }

    // Merging is irreversible, so it is confirmed unless explicitly waived.
    if (args["yes"] !== true && !io.isInteractive) {
      throw new UsageError(
        `Refusing to merge #${id} without confirmation.`,
        "Re-run with --yes, or run interactively.",
      );
    }

    const outcome = await bb.pullRequests.merge(
      { ...repo, id },
      {
        ...(requested === undefined ? {} : { strategy: requested as MergeStrategy }),
        message: args["message"] as string | undefined,
        closeSourceBranch: args["delete-branch"] === true ? true : undefined,
        // Bitbucket may answer 202 with a task to poll rather than merging inline;
        // waiting here keeps the command's contract simple.
        wait: true,
      },
    );

    if (outcome.status !== "merged") {
      throw new UsageError(`Merge of #${id} did not complete.`);
    }

    return {
      kind: "data",
      data: [outcome.pullRequest],
      render: ([only], target) => {
        if (only !== undefined) {
          target.info(`Merged #${only.id} — ${only.title}`);
        }
      },
    };
  },
});
