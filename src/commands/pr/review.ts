import { defineBbCommand } from "../../command.js";
import { UsageError } from "../../errors.js";
import type { ReviewDecision } from "../../flavor/domain.js";
import { getRuntime } from "../../runtime.js";
import { repoFromArgs } from "../context.js";
import { resolvePullRequestId } from "./id.js";

export default defineBbCommand<never>({
  meta: { name: "review", description: "Approve or request changes on a pull request" },
  args: {
    id: {
      type: "positional",
      description: "Pull request number (default: the current branch's)",
      required: false,
    },
    approve: { type: "boolean", alias: "a", description: "Approve" },
    "request-changes": { type: "boolean", alias: "r", description: "Request changes" },
    unapprove: { type: "boolean", description: "Withdraw your approval or change request" },
    comment: { type: "string", alias: "c", description: "Leave a comment alongside the decision" },
  },
  examples: ["bb pr review --approve", "bb pr review 42 -r -c 'needs a test'"],
  async run({ args }) {
    const bb = await getRuntime().client();
    const repo = await repoFromArgs(args);
    const id = await resolvePullRequestId(args, bb, repo);

    const chosen = (
      [
        [args["approve"] === true, "approved"],
        [args["request-changes"] === true, "changes-requested"],
        [args["unapprove"] === true, "none"],
      ] as const
    ).filter(([selected]) => selected);

    if (chosen.length > 1) {
      throw new UsageError("Pass only one of --approve, --request-changes or --unapprove.");
    }

    const comment = args["comment"] as string | undefined;
    if (chosen.length === 0 && comment === undefined) {
      throw new UsageError(
        "Nothing to do.",
        "Pass --approve, --request-changes, --unapprove, or --comment.",
      );
    }

    if (comment !== undefined) {
      await bb.pullRequests.addComment({ ...repo, id }, { body: comment });
    }

    const decision = chosen[0]?.[1] as ReviewDecision | undefined;
    if (decision !== undefined) {
      // Modelled as an intent: Cloud spreads this across four endpoints.
      await bb.pullRequests.setReview({ ...repo, id }, decision);
    }

    return {
      kind: "none",
    };
  },
});
