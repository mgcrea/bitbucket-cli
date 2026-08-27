import { defineBbCommand } from "../../command.js";
import { UsageError } from "../../errors.js";
import type { PipelineStatus, PipelineSummary } from "../../flavor/domain.js";
import type { FieldMap } from "../../output/fields.js";
import { type Column, renderTable } from "../../output/table.js";
import { collect } from "../../pagination/collect.js";
import { getRuntime } from "../../runtime.js";
import { repoFromArgs } from "../context.js";
import { ALL_STATUSES, formatDuration, STATUS_MARK, STATUS_STYLE } from "./status.js";

const FIELDS: FieldMap<PipelineSummary> = {
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
  url: { pick: (run) => run.url },
};

const columns = (io: Awaited<ReturnType<typeof getRuntime>>["io"]): Column<PipelineSummary>[] => [
  // The glyph is a scanning aid for a terminal and duplicates STATUS, so it is dropped
  // when piped rather than becoming a stray first TSV field.
  ...(io.isTTY
    ? [
        {
          header: "",
          value: (run: PipelineSummary) =>
            io.style(STATUS_STYLE[run.status], STATUS_MARK[run.status]),
        },
      ]
    : []),
  { header: "BUILD", value: (run) => String(run.buildNumber), align: "right" },
  { header: "STATUS", value: (run) => io.style(STATUS_STYLE[run.status], run.status) },
  { header: "REF", value: (run) => run.refName ?? "", flex: true, minWidth: 10 },
  { header: "PIPELINE", value: (run) => run.selector ?? "", flex: true, minWidth: 8 },
  { header: "TRIGGER", value: (run) => (run.trigger ?? "").toLowerCase() },
  { header: "TIME", value: (run) => formatDuration(run.durationSeconds), align: "right" },
  {
    header: "STARTED",
    value: (run) => io.style("dim", run.createdAt.slice(0, 16).replace("T", " ")),
  },
];

export default defineBbCommand<PipelineSummary>({
  meta: { name: "list", description: "List pipeline runs" },
  args: {
    limit: { type: "string", alias: "L", description: "Maximum number to fetch", default: "20" },
    ref: { type: "string", alias: "b", description: "Filter by branch or tag name" },
    status: {
      type: "string",
      alias: "s",
      description: `Filter by status: ${ALL_STATUSES.join(", ")} (comma-separated)`,
    },
    failed: { type: "boolean", description: "Shorthand for --status failed,error,stopped" },
  },
  fields: FIELDS,
  examples: [
    "bb pipeline list",
    "bb pipeline list --ref main --limit 10",
    "bb pipeline list --failed",
    "bb pipeline list --json buildNumber,status --jq '.[] | select(.status==\"failed\")'",
  ],
  async run({ args }) {
    const { io, client } = getRuntime();
    const bb = await client();
    const repo = await repoFromArgs(args);

    const raw =
      args["failed"] === true ? "failed,error,stopped" : (args["status"] as string | undefined);
    const status = raw
      ?.split(",")
      .map((value) => value.trim())
      .filter((value) => value !== "") as PipelineStatus[] | undefined;

    for (const value of status ?? []) {
      if (!ALL_STATUSES.includes(value)) {
        throw new UsageError(
          `Unknown status ${JSON.stringify(value)}.`,
          `Valid values: ${ALL_STATUSES.join(", ")}`,
        );
      }
    }

    const data = await collect(
      bb.pipelines.list({
        ...repo,
        limit: Number.parseInt(String(args["limit"] ?? "20"), 10),
        ref: args["ref"] as string | undefined,
        ...(status === undefined ? {} : { status }),
      }),
    );

    return {
      kind: "data",
      data,
      render: (rows, target) => {
        if (rows.length === 0) {
          target.info("No pipeline runs found.");
          return;
        }
        renderTable(rows, columns(io), target);
      },
    };
  },
});
