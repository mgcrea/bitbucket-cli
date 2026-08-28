import { defineBbCommand } from "../../command.js";
import type { RepositorySummary } from "../../flavor/domain.js";
import type { FieldMap } from "../../output/fields.js";
import { type Column, renderTable } from "../../output/table.js";
import { collect } from "../../pagination/collect.js";
import { getRuntime } from "../../runtime.js";
import { workspaceFromArgs } from "../context.js";

const FIELDS: FieldMap<RepositorySummary> = {
  name: { api: ["name", "slug"], pick: (repo) => repo.slug },
  fullName: { api: ["full_name"], pick: (repo) => repo.fullName },
  uuid: { api: ["uuid"], pick: (repo) => repo.uuid },
  isPrivate: { api: ["is_private"], pick: (repo) => repo.isPrivate },
  description: { api: ["description"], pick: (repo) => repo.description },
  language: { api: ["language"], pick: (repo) => repo.language },
  mainBranch: { api: ["mainbranch.name"], pick: (repo) => repo.mainBranch },
  updatedAt: { api: ["updated_on"], pick: (repo) => repo.updatedAt },
  url: { api: ["links.html.href"], pick: (repo) => repo.url },
};

const columns = (io: ReturnType<typeof getRuntime>["io"]): Column<RepositorySummary>[] => [
  { header: "NAME", value: (repo) => repo.fullName, flex: true, minWidth: 16 },
  { header: "VISIBILITY", value: (repo) => (repo.isPrivate ? "private" : "public") },
  { header: "DESCRIPTION", value: (repo) => repo.description ?? "", flex: true, minWidth: 10 },
  { header: "UPDATED", value: (repo) => io.style("dim", (repo.updatedAt ?? "").slice(0, 10)) },
];

export default defineBbCommand<RepositorySummary>({
  meta: { name: "list", description: "List repositories in a workspace" },
  args: {
    limit: { type: "string", alias: "L", description: "Maximum number to fetch", default: "30" },
    role: { type: "string", description: "Filter by your role: owner, admin, contributor, member" },
    sort: { type: "string", description: "Sort field, prefixed with - for descending" },
  },
  fields: FIELDS,
  examples: ["bb repo list --workspace acme", "bb repo list -W acme --json fullName --jq '.[]'"],
  async run({ args }) {
    const { io, client } = getRuntime();
    const bb = await client();
    // Required: the endpoint that listed repositories across every workspace was
    // removed by Atlassian and now returns 410.
    const workspace = await workspaceFromArgs(args);

    const data = await collect(
      bb.repositories.list({
        workspace,
        limit: Number.parseInt(String(args["limit"] ?? "30"), 10),
        role: args["role"] as "owner" | "admin" | "contributor" | "member" | undefined,
        sort: args["sort"] as string | undefined,
      }),
    );

    return {
      kind: "data",
      data,
      render: (rows, target) => {
        if (rows.length === 0) {
          target.info(`No repositories found in ${workspace}.`);
          return;
        }
        renderTable(rows, columns(io), target);
      },
    };
  },
});
