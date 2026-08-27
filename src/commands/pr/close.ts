import { defineBbCommand } from "../../command.js";
import { UsageError } from "../../errors.js";
import type { PullRequest } from "../../flavor/domain.js";
import type { FieldMap } from "../../output/fields.js";
import { getRuntime } from "../../runtime.js";
import { repoFromArgs } from "../context.js";
import { resolvePullRequestId } from "./id.js";

const FIELDS: FieldMap<PullRequest> = {
  id: { pick: (pr) => pr.id },
  title: { pick: (pr) => pr.title },
  state: { pick: (pr) => pr.state },
  url: { pick: (pr) => pr.url },
};

export default defineBbCommand<PullRequest>({
  meta: { name: "close", description: "Decline a pull request" },
  args: {
    id: {
      type: "positional",
      description: "Pull request number (default: the current branch's)",
      required: false,
    },
    yes: { type: "boolean", alias: "y", description: "Skip the confirmation prompt" },
  },
  fields: FIELDS,
  examples: ["bb pr close 42 --yes"],
  async run({ args }) {
    const { io, client } = getRuntime();
    const bb = await client();
    const repo = await repoFromArgs(args);
    const id = await resolvePullRequestId(args, bb, repo);

    // Bitbucket Cloud has no reopen endpoint — declining cannot be undone through the
    // API — so this always confirms.
    if (args["yes"] !== true && !io.isInteractive) {
      throw new UsageError(
        `Refusing to decline #${id} without confirmation.`,
        "Bitbucket Cloud has no reopen endpoint, so this cannot be undone from the CLI.\n" +
          "  Re-run with --yes if you are sure.",
      );
    }

    const pr = await bb.pullRequests.decline({ ...repo, id });
    return {
      kind: "data",
      data: [pr],
      render: ([only], target) => {
        if (only !== undefined) {
          target.info(`Declined #${only.id} — ${only.title}`);
        }
      },
    };
  },
});
