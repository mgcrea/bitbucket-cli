import { defineBbCommand } from "../../command.js";
import { readConfig, writeConfig } from "../../config/config.js";
import { UsageError } from "../../errors.js";
import { getRuntime } from "../../runtime.js";

export default defineBbCommand<never>({
  meta: { name: "delete", description: "Remove an alias" },
  args: { name: { type: "positional", description: "Alias name", required: true } },
  examples: ["bb alias delete prs"],
  async run({ args }) {
    const { io } = getRuntime();
    const name = String(args["name"]);
    const config = await readConfig();
    const aliases = { ...config.aliases };

    if (aliases[name] === undefined) {
      throw new UsageError(`No alias named ${JSON.stringify(name)}.`);
    }
    delete aliases[name];
    await writeConfig({ ...config, aliases });

    io.info(`Deleted alias ${name}.`);
    return { kind: "none" };
  },
});
