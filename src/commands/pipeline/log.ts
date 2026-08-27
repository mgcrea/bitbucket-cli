import { defineBbCommand } from "../../command.js";
import { UsageError } from "../../errors.js";
import { NotFoundError } from "../../http/errors.js";
import { collect, first } from "../../pagination/collect.js";
import { getRuntime } from "../../runtime.js";
import { repoFromArgs } from "../context.js";

export default defineBbCommand<never>({
  meta: { name: "log", description: "Print the log for a pipeline step" },
  args: {
    selector: {
      type: "positional",
      description: "Build number or pipeline UUID. Defaults to the latest run.",
      required: false,
    },
    step: { type: "string", description: "Step name or number (default: the first step)" },
  },
  examples: ["bb pipeline log", "bb pipeline log 276", "bb pipeline log --step 2"],
  async run({ args }) {
    const bb = await getRuntime().client();
    const repo = await repoFromArgs(args);
    const selector = args["selector"] as string | undefined;

    const run =
      selector === undefined || selector === ""
        ? await first(bb.pipelines.list({ ...repo, limit: 1 }))
        : await bb.pipelines.get(repo, selector);

    if (run === undefined) {
      throw new UsageError("No pipeline runs found for this repository.");
    }

    const steps = await collect(bb.pipelines.steps(repo, run.uuid));
    if (steps.length === 0) {
      throw new UsageError(
        `Pipeline #${run.buildNumber} has no steps.`,
        run.errorMessage ?? "It may have failed before any step started.",
      );
    }

    const wanted = args["step"] as string | undefined;
    const index = wanted === undefined ? 1 : Number.parseInt(wanted, 10);
    const step = Number.isFinite(index)
      ? steps[index - 1]
      : steps.find((candidate) => candidate.name === wanted);

    if (step === undefined) {
      throw new UsageError(
        `No such step ${JSON.stringify(wanted)}.`,
        `Steps: ${steps.map((s, i) => `${i + 1}. ${s.name}`).join(", ")}`,
      );
    }

    // Plain text, so this bypasses the formatting layer entirely.
    const text = await bb.pipelines.log(repo, run.uuid, step.uuid).catch((error: unknown) => {
      // Bitbucket expires pipeline logs well before it expires the run itself, so a
      // 404 here usually means the run is simply too old rather than misaddressed.
      if (error instanceof NotFoundError) {
        throw new UsageError(
          error.message,
          `Pipeline logs are retained for a limited period. Run #${run.buildNumber} started ` +
            `${run.createdAt.slice(0, 10)}, so its logs have most likely expired.`,
        );
      }
      throw error;
    });
    return { kind: "text", text };
  },
});
