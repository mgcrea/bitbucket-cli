import { collectRepeated } from "../../bin/repeated.js";
import { defineBbCommand } from "../../command.js";
import { UsageError } from "../../errors.js";
import type { PipelineSummary } from "../../flavor/domain.js";
import { currentBranch } from "../../git/log.js";
import type { FieldMap } from "../../output/fields.js";
import { getRuntime } from "../../runtime.js";
import { repoFromArgs } from "../context.js";
import { STATUS_MARK, STATUS_STYLE } from "./status.js";

const FIELDS: FieldMap<PipelineSummary> = {
  buildNumber: { pick: (run) => run.buildNumber },
  uuid: { pick: (run) => run.uuid },
  status: { pick: (run) => run.status },
  refName: { pick: (run) => run.refName },
  selector: { pick: (run) => run.selector },
  commit: { pick: (run) => run.commit },
  url: { pick: (run) => run.url },
};

export default defineBbCommand<PipelineSummary>({
  meta: { name: "run", description: "Trigger a pipeline" },
  args: {
    pipeline: {
      type: "positional",
      description: "Custom pipeline name from bitbucket-pipelines.yml",
      required: false,
    },
    ref: { type: "string", alias: "b", description: "Branch or tag (default: the current branch)" },
    tag: { type: "boolean", description: "Treat --ref as a tag rather than a branch" },
    commit: { type: "string", alias: "c", description: "Run against a specific commit" },
    variable: {
      type: "string",
      alias: "v",
      description: "Pipeline variable as KEY=VALUE (repeatable)",
    },
    secured: {
      type: "string",
      description: "Secured variable as KEY=VALUE, masked in logs (repeatable)",
    },
  },
  fields: FIELDS,
  examples: [
    "bb pipeline run",
    "bb pipeline run docker-build --ref main",
    "bb pipeline run deploy -v ENV=staging --secured TOKEN=xyz",
  ],
  async run({ args }) {
    const { client, rawArgs } = getRuntime();
    const bb = await client();
    const repo = await repoFromArgs(args);

    const ref = (args["ref"] as string | undefined) ?? (await currentBranch());
    if (ref === undefined && args["commit"] === undefined) {
      throw new UsageError(
        "No ref to run against: HEAD is detached and no --ref was given.",
        "Pass --ref <branch>, or --commit <hash>.",
      );
    }

    // Read from argv: citty collapses a repeated flag to its last value.
    const parse = (pairs: readonly string[], secured: boolean) =>
      pairs.map((pair) => {
        const separator = pair.indexOf("=");
        if (separator <= 0) {
          throw new UsageError(`Expected KEY=VALUE, got ${JSON.stringify(pair)}`);
        }
        return {
          key: pair.slice(0, separator),
          value: pair.slice(separator + 1),
          secured,
        };
      });

    const variables = [
      ...parse(collectRepeated(rawArgs, ["v", "variable"]), false),
      ...parse(collectRepeated(rawArgs, ["secured"]), true),
    ];

    const run = await bb.pipelines.trigger(repo, {
      ref,
      refType: args["tag"] === true ? "tag" : "branch",
      pipeline: args["pipeline"] as string | undefined,
      commit: args["commit"] as string | undefined,
      ...(variables.length === 0 ? {} : { variables }),
    });

    return {
      kind: "data",
      data: [run],
      single: true,
      render: ([only], io) => {
        if (only === undefined) {
          return;
        }
        const mark = io.style(STATUS_STYLE[only.status], STATUS_MARK[only.status]);
        io.info(`${mark} Started #${only.buildNumber} on ${only.refName ?? "?"}`);
        io.out(only.url);
      },
    };
  },
});
