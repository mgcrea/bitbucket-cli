import { defineBbCommand } from "../../command.js";
import type { PullRequest } from "../../flavor/domain.js";
import type { FieldMap } from "../../output/fields.js";
import { getRuntime } from "../../runtime.js";
import { repoFromArgs } from "../context.js";
import { resolvePullRequestId } from "./id.js";

const FIELDS: FieldMap<PullRequest> = {
  id: { pick: (pr) => pr.id },
  title: { pick: (pr) => pr.title },
  draft: { pick: (pr) => pr.draft },
  url: { pick: (pr) => pr.url },
};

export default defineBbCommand<PullRequest>({
  meta: { name: "ready", description: "Mark a draft pull request as ready for review" },
  args: {
    id: {
      type: "positional",
      description: "Pull request number (default: the current branch's)",
      required: false,
    },
    undo: { type: "boolean", description: "Convert back to a draft instead" },
  },
  fields: FIELDS,
  examples: ["bb pr ready", "bb pr ready 42 --undo"],
  async run({ args }) {
    const bb = await getRuntime().client();
    const repo = await repoFromArgs(args);
    const id = await resolvePullRequestId(args, bb, repo);
    const draft = args["undo"] === true;

    const pr = await bb.pullRequests.update({ ...repo, id }, { draft });
    return {
      kind: "data",
      data: [pr],
      render: ([only], io) => {
        if (only !== undefined) {
          io.info(`#${only.id} is now ${draft ? "a draft" : "ready for review"}.`);
        }
      },
    };
  },
});
