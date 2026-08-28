import { defineBbCommand } from "../../command.js";
import { UsageError } from "../../errors.js";
import { rootCommand } from "../index.js";
import { generateCompletion, SHELLS, type Shell } from "./generate.js";
import { buildCommandTree } from "./tree.js";

export default defineBbCommand<never>({
  meta: { name: "completion", description: "Print a shell completion script" },
  args: {
    shell: {
      type: "string",
      alias: "s",
      description: `One of: ${SHELLS.join(", ")}`,
    },
  },
  examples: [
    'eval "$(bb completion -s zsh)"',
    "bb completion -s fish | source",
    "bb completion -s bash > /etc/bash_completion.d/bb",
  ],
  async run({ args }) {
    const shell = args["shell"] as string | undefined;
    if (shell === undefined || !SHELLS.includes(shell as Shell)) {
      throw new UsageError(
        shell === undefined ? "Which shell?" : `Unknown shell ${JSON.stringify(shell)}.`,
        `Pass -s with one of: ${SHELLS.join(", ")}`,
      );
    }

    // Generated from the same tree that dispatches, so it cannot drift from the
    // commands that actually exist.
    const tree = await buildCommandTree(rootCommand, "bb");
    return { kind: "text", text: generateCompletion(shell as Shell, tree) };
  },
});
