import { defineBbCommand } from "../../command.js";
import type { Repository } from "../../flavor/domain.js";
import type { FieldMap } from "../../output/fields.js";
import { getRuntime } from "../../runtime.js";
import { repoFromArgs } from "../context.js";

const FIELDS: FieldMap<Repository> = {
  name: { pick: (repo) => repo.slug },
  fullName: { pick: (repo) => repo.fullName },
  uuid: { pick: (repo) => repo.uuid },
  isPrivate: { pick: (repo) => repo.isPrivate },
  description: { pick: (repo) => repo.description },
  language: { pick: (repo) => repo.language },
  mainBranch: { pick: (repo) => repo.mainBranch },
  project: { pick: (repo) => repo.project },
  cloneUrls: { pick: (repo) => repo.cloneUrls },
  url: { pick: (repo) => repo.url },
};

export default defineBbCommand<Repository>({
  meta: { name: "view", description: "View a repository" },
  args: { repository: { type: "positional", description: "workspace/repo", required: false } },
  fields: FIELDS,
  examples: ["bb repo view", "bb repo view acme/api --json cloneUrls"],
  async run({ args }) {
    const bb = await getRuntime().client();
    const positional = args["repository"] as string | undefined;
    const ref = await repoFromArgs(positional === undefined ? args : { ...args, repo: positional });
    const repo = await bb.repositories.get(ref);

    return {
      kind: "data",
      data: [repo],
      single: true,
      render: ([only], io) => {
        if (only === undefined) {
          return;
        }
        io.out(io.style("bold", only.fullName));
        io.out(io.style("dim", only.isPrivate ? "private" : "public"));
        if (only.description !== undefined && only.description !== "") {
          io.out("");
          io.out(only.description);
        }
        io.out("");
        if (only.mainBranch !== undefined) {
          io.out(`Default branch: ${only.mainBranch}`);
        }
        if (only.cloneUrls.ssh !== undefined) {
          io.out(`Clone (ssh):    ${only.cloneUrls.ssh}`);
        }
        io.out(io.style("dim", only.url));
      },
    };
  },
});
