import { defineBbCommand } from "../../command.js";
import type { PipelineStep, PipelineSummary } from "../../flavor/domain.js";
import type { FieldMap } from "../../output/fields.js";
import { collect, first } from "../../pagination/collect.js";
import { getRuntime } from "../../runtime.js";
import { repoFromArgs } from "../context.js";
import { formatDuration, STATUS_MARK, STATUS_STYLE } from "./status.js";

type PipelineDetail = PipelineSummary & { steps: PipelineStep[] };

const FIELDS: FieldMap<PipelineDetail> = {
  buildNumber: { pick: (run) => run.buildNumber },
  uuid: { pick: (run) => run.uuid },
  status: { pick: (run) => run.status },
  stateName: { pick: (run) => run.stateName },
  stage: { pick: (run) => run.stage },
  refName: { pick: (run) => run.refName },
  selector: { pick: (run) => run.selector },
  commit: { pick: (run) => run.commit },
  trigger: { pick: (run) => run.trigger },
  creator: { pick: (run) => run.creator },
  createdAt: { pick: (run) => run.createdAt },
  durationSeconds: { pick: (run) => run.durationSeconds },
  errorMessage: { pick: (run) => run.errorMessage },
  steps: { pick: (run) => run.steps },
  url: { pick: (run) => run.url },
};

export default defineBbCommand<PipelineDetail>({
  meta: { name: "view", description: "Show one pipeline run and its steps" },
  args: {
    selector: {
      type: "positional",
      description: "Build number or pipeline UUID. Defaults to the latest run.",
      required: false,
    },
  },
  fields: FIELDS,
  examples: ["bb pipeline view", "bb pipeline view 276", "bb pipeline view --json status"],
  async run({ args }) {
    const bb = await getRuntime().client();
    const repo = await repoFromArgs(args);
    const selector = args["selector"] as string | undefined;

    // No argument means "the one I just triggered", which is the common case.
    const run =
      selector === undefined || selector === ""
        ? await first(bb.pipelines.list({ ...repo, limit: 1 }))
        : await bb.pipelines.get(repo, selector);

    if (run === undefined) {
      return { kind: "data", data: [], render: (_rows, io) => io.info("No pipeline runs found.") };
    }

    // A run that failed before any step started has none; that is not an error.
    const steps = await collect(bb.pipelines.steps(repo, run.uuid)).catch(() => []);

    return {
      kind: "data",
      data: [{ ...run, steps }],
      render: ([only], io) => {
        if (only === undefined) {
          return;
        }
        const mark = io.style(STATUS_STYLE[only.status], STATUS_MARK[only.status]);
        io.out(
          `${mark} ${io.style("bold", `#${only.buildNumber}`)} ` +
            `${io.style(STATUS_STYLE[only.status], only.status)}` +
            (only.stage === undefined ? "" : ` (${only.stage})`),
        );
        io.out(
          io.style(
            "dim",
            [
              only.refName === undefined ? undefined : `${only.refType ?? "ref"} ${only.refName}`,
              only.selector === undefined ? undefined : `pipeline ${only.selector}`,
              only.commit === undefined ? undefined : only.commit.slice(0, 8),
              only.trigger === undefined ? undefined : only.trigger.toLowerCase(),
              only.creator,
              formatDuration(only.durationSeconds),
            ]
              .filter((part) => part !== undefined && part !== "")
              .join(" · "),
          ),
        );

        if (only.errorMessage !== undefined) {
          io.out("");
          // Bitbucket's own explanation is usually the entire diagnosis.
          io.out(io.style("red", only.errorMessage));
        }

        if (only.steps.length > 0) {
          io.out("");
          for (const step of only.steps) {
            const stepMark = io.style(STATUS_STYLE[step.status], STATUS_MARK[step.status]);
            const duration = formatDuration(step.durationSeconds);
            io.out(
              `  ${stepMark} ${step.name}${duration === "" ? "" : io.style("dim", `  ${duration}`)}`,
            );
            if (step.errorMessage !== undefined) {
              io.out(`    ${io.style("red", step.errorMessage)}`);
            }
          }
        }

        io.out("");
        io.out(io.style("dim", only.url));
      },
    };
  },
});
