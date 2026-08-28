import { defineBbCommand } from "../../command.js";
import { UsageError } from "../../errors.js";
import { first } from "../../pagination/collect.js";
import { getRuntime } from "../../runtime.js";
import { repoFromArgs } from "../context.js";

export default defineBbCommand<never>({
  meta: { name: "stop", description: "Stop a running pipeline" },
  args: {
    selector: {
      type: "positional",
      description: "Build number or pipeline UUID (default: the running one)",
      required: false,
    },
  },
  examples: ["bb pipeline stop", "bb pipeline stop 279"],
  async run({ args }) {
    const { io, client } = getRuntime();
    const bb = await client();
    const repo = await repoFromArgs(args);
    const selector = args["selector"] as string | undefined;

    const run =
      selector === undefined || selector === ""
        ? await first(bb.pipelines.list({ ...repo, status: ["in-progress", "pending"], limit: 1 }))
        : await bb.pipelines.get(repo, selector);

    if (run === undefined) {
      throw new UsageError("No running pipeline found.", "Pass a build number explicitly.");
    }

    await bb.pipelines.stop(repo, run.uuid);
    io.info(`Stopped #${run.buildNumber}.`);
    return { kind: "none" };
  },
});
