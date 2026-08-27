import { defineBbCommand } from "../../command.js";
import { UsageError } from "../../errors.js";
import type { PullRequest } from "../../flavor/domain.js";
import type { FieldMap } from "../../output/fields.js";
import { getRuntime } from "../../runtime.js";
import { repoFromArgs } from "../context.js";

const FIELDS: FieldMap<PullRequest> = {
  id: { pick: (pr) => pr.id },
  title: { pick: (pr) => pr.title },
  state: { pick: (pr) => pr.state },
  draft: { pick: (pr) => pr.draft },
  description: { pick: (pr) => pr.description },
  author: { pick: (pr) => pr.author },
  reviewers: { pick: (pr) => pr.reviewers },
  source: { pick: (pr) => pr.source },
  destination: { pick: (pr) => pr.destination },
  createdAt: { pick: (pr) => pr.createdAt },
  updatedAt: { pick: (pr) => pr.updatedAt },
  url: { pick: (pr) => pr.url },
};

export default defineBbCommand<PullRequest>({
  meta: { name: "view", description: "View a pull request" },
  args: {
    id: { type: "positional", description: "Pull request number", required: true },
  },
  fields: FIELDS,
  examples: ["bb pr view 42", "bb pr view 42 --json title,state"],
  async run({ args }) {
    const bb = await getRuntime().client();
    const repo = await repoFromArgs(args);
    const id = Number.parseInt(String(args["id"]), 10);
    if (!Number.isFinite(id)) {
      throw new UsageError(`Expected a pull-request number, got ${JSON.stringify(args["id"])}`);
    }

    const pr = await bb.pullRequests.get({ ...repo, id });

    return {
      kind: "data",
      data: [pr],
      render: ([only], io) => {
        if (only === undefined) {
          return;
        }
        io.out(io.style("bold", only.title));
        const badge = only.draft ? "DRAFT" : only.state.toUpperCase();
        io.out(
          `${io.style("dim", badge)} · ${only.author.displayName} wants to merge ` +
            `${only.source.name} into ${only.destination.name}`,
        );
        if (only.reviewers.length > 0) {
          const approved = only.reviewers.filter((r) => r.decision === "approved").length;
          io.out(io.style("dim", `${approved}/${only.reviewers.length} approved`));
        }
        if (only.description !== "") {
          io.out("");
          io.out(only.description);
        }
        io.out("");
        io.out(io.style("dim", only.url));
      },
    };
  },
});
