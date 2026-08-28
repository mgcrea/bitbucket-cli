import { defineBbCommand } from "../../command.js";
import { readConfig } from "../../config/config.js";
import { readSetting, SETTING_KEYS, SETTINGS } from "../../config/settings.js";
import type { FieldMap } from "../../output/fields.js";
import { type Column, renderTable } from "../../output/table.js";
import { getRuntime } from "../../runtime.js";

type Entry = { key: string; value: string | null; description: string };

const FIELDS: FieldMap<Entry> = {
  key: { pick: (entry) => entry.key },
  value: { pick: (entry) => entry.value },
  description: { pick: (entry) => entry.description },
};

const columns = (io: ReturnType<typeof getRuntime>["io"]): Column<Entry>[] => [
  { header: "KEY", value: (entry) => entry.key },
  {
    header: "VALUE",
    // "(unset)" is a label for a human reading a table. Down a pipe the field has to be
    // empty, or `bb config list | awk -F'\t' '$2 == ""'` finds nothing.
    value: (entry) => entry.value ?? (io.isTTY ? io.style("dim", "(unset)") : ""),
  },
  { header: "DESCRIPTION", value: (entry) => entry.description, flex: true, minWidth: 20 },
];

export default defineBbCommand<Entry>({
  meta: { name: "list", description: "Show every setting and its value" },
  fields: FIELDS,
  examples: ["bb config list", "bb config list --json key,value"],
  async run() {
    const { io } = getRuntime();
    const config = await readConfig();

    // Every known setting is listed, set or not. A settings list that only showed what
    // happens to be in the file would hide the thing people actually want from it —
    // discovering what they *can* set.
    const data = SETTING_KEYS.map((key) => ({
      key,
      value: readSetting(config, key) ?? null,
      description: SETTINGS[key].description,
    }));

    return { kind: "data", data, render: (rows, target) => renderTable(rows, columns(io), target) };
  },
});
