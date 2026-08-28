import { defineBbCommand } from "../../command.js";
import { readConfig, writeConfig } from "../../config/config.js";
import { UsageError } from "../../errors.js";
import { getRuntime } from "../../runtime.js";
import { RESERVED_NAMES } from "../reserved.js";

export default defineBbCommand<never>({
  meta: { name: "set", description: "Create or update an alias" },
  args: {
    name: { type: "positional", description: "Alias name", required: true },
    expansion: { type: "positional", description: "What it expands to", required: true },
    shell: {
      type: "boolean",
      alias: "s",
      description: "Run the expansion through your shell instead of through bb",
    },
  },
  examples: [
    "bb alias set prs 'pr list --state open --limit 50'",
    'bb alias set --shell bugs \'bb pr list --json title --jq ".[] | select(.title | test(\\"bug\\"))"\'',
  ],
  async run({ args }) {
    const { io } = getRuntime();
    const name = String(args["name"]);
    const expansion = String(args["expansion"]);

    // A built-in must always win, so refuse at set time rather than silently
    // creating an alias that can never fire.
    if (RESERVED_NAMES.includes(name)) {
      throw new UsageError(
        `${JSON.stringify(name)} is a built-in command.`,
        "Built-ins always take precedence, so this alias could never run.",
      );
    }
    if (name.startsWith("-")) {
      throw new UsageError("An alias name cannot start with a dash.");
    }

    const config = await readConfig();
    const aliases = { ...config.aliases };
    const previous = aliases[name];
    aliases[name] = args["shell"] === true ? `!${expansion}` : expansion;
    await writeConfig({ ...config, aliases });

    io.info(previous === undefined ? `Added alias ${name}.` : `Updated alias ${name}.`);
    return { kind: "none" };
  },
});
