import { defineBbCommand } from "../../command.js";
import type { WorkspaceSummary } from "../../flavor/domain.js";
import type { FieldMap } from "../../output/fields.js";
import { type Column, renderTable } from "../../output/table.js";
import { collect } from "../../pagination/collect.js";
import { getRuntime } from "../../runtime.js";

const FIELDS: FieldMap<WorkspaceSummary> = {
  slug: { pick: (workspace) => workspace.slug },
  name: { pick: (workspace) => workspace.name },
  uuid: { pick: (workspace) => workspace.uuid },
  isAdministrator: { pick: (workspace) => workspace.isAdministrator },
  url: { pick: (workspace) => workspace.url },
};

const columns: Column<WorkspaceSummary>[] = [
  { header: "SLUG", value: (workspace) => workspace.slug, flex: true, minWidth: 12 },
  { header: "NAME", value: (workspace) => workspace.name, flex: true, minWidth: 12 },
  { header: "ROLE", value: (workspace) => (workspace.isAdministrator ? "admin" : "member") },
];

export default defineBbCommand<WorkspaceSummary>({
  meta: { name: "list", description: "List the workspaces you can access" },
  args: {
    limit: { type: "string", alias: "L", description: "Maximum number to fetch", default: "50" },
  },
  fields: FIELDS,
  examples: ["bb workspace list", "bb workspace list --json slug --jq '.[].slug'"],
  async run({ args }) {
    const bb = await getRuntime().client();
    const data = await collect(
      bb.workspaces.list({ limit: Number.parseInt(String(args["limit"] ?? "50"), 10) }),
    );

    return {
      kind: "data",
      data,
      render: (rows, io) => {
        if (rows.length === 0) {
          io.info("No workspaces found for this credential.");
          return;
        }
        renderTable(rows, columns, io);
      },
    };
  },
});
