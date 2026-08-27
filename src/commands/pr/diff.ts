import { defineBbCommand } from "../../command.js";
import { UsageError } from "../../errors.js";
import { getRuntime } from "../../runtime.js";
import { repoFromArgs } from "../context.js";

export default defineBbCommand<never>({
  meta: { name: "diff", description: "View the diff for a pull request" },
  args: {
    id: { type: "positional", description: "Pull request number", required: true },
    patch: { type: "boolean", description: "Output a git patch instead of a diff" },
  },
  examples: ["bb pr diff 42", "bb pr diff 42 --patch | git apply"],
  async run({ args }) {
    const { client } = getRuntime();
    const repo = await repoFromArgs(args);
    const id = Number.parseInt(String(args["id"]), 10);
    if (!Number.isFinite(id)) {
      throw new UsageError(`Expected a pull-request number, got ${JSON.stringify(args["id"])}`);
    }

    const ref = { ...repo, id };
    // Text, not JSON — this deliberately bypasses the formatting layer entirely.
    const text =
      args["patch"] === true
        ? await client().pullRequests.patch(ref)
        : await client().pullRequests.diff(ref);
    return { kind: "text", text };
  },
});
