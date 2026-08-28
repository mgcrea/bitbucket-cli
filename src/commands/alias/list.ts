import { defineBbCommand } from "../../command.js";
import { readConfig } from "../../config/config.js";
import type { FieldMap } from "../../output/fields.js";
import { type Column, renderTable } from "../../output/table.js";

type Alias = { name: string; expansion: string; shell: boolean };

const FIELDS: FieldMap<Alias> = {
  name: { pick: (alias) => alias.name },
  expansion: { pick: (alias) => alias.expansion },
  shell: { pick: (alias) => alias.shell },
};

const columns: Column<Alias>[] = [
  { header: "NAME", value: (alias) => alias.name },
  { header: "EXPANSION", value: (alias) => alias.expansion, flex: true, minWidth: 20 },
  { header: "SHELL", value: (alias) => (alias.shell ? "yes" : "") },
];

export default defineBbCommand<Alias>({
  meta: { name: "list", description: "List aliases" },
  fields: FIELDS,
  examples: ["bb alias list", "bb alias list --json name --jq '.[].name'"],
  async run() {
    const config = await readConfig();
    const data = Object.entries(config.aliases ?? {})
      .map(([name, body]) => ({
        name,
        expansion: body.startsWith("!") ? body.slice(1) : body,
        shell: body.startsWith("!"),
      }))
      .toSorted((a, b) => a.name.localeCompare(b.name));

    return {
      kind: "data",
      data,
      render: (rows, io) => {
        if (rows.length === 0) {
          io.info("No aliases. Add one with `bb alias set`.");
          return;
        }
        renderTable(rows, columns, io);
      },
    };
  },
});
