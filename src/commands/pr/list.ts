import { defineBbCommand } from "../../command.js";
import type { PullRequestSummary } from "../../flavor/domain.js";
import type { PullRequestState } from "../../flavor/domain.js";
import type { FieldMap } from "../../output/fields.js";
import { projectionFor } from "../../output/fields.js";
import { type Column, renderTable } from "../../output/table.js";
import { collect } from "../../pagination/collect.js";
import { getRuntime } from "../../runtime.js";
import { repoFromArgs } from "../context.js";

/**
 * The `--json` field map.
 *
 * `api` lists the `fields=` terms each key needs, so `--json id,title` sends a
 * projection that asks Bitbucket for exactly those and nothing else. This is the win
 * gh cannot match: GitHub's REST API has no partial-response parameter, so gh must
 * fetch whole objects and discard most of them client-side.
 */
const FIELDS: FieldMap<PullRequestSummary> = {
  id: { api: ["id"], pick: (pr) => pr.id },
  title: { api: ["title"], pick: (pr) => pr.title },
  state: { api: ["state"], pick: (pr) => pr.state },
  draft: { api: ["draft"], pick: (pr) => pr.draft },
  author: { api: ["author.display_name", "author.uuid"], pick: (pr) => pr.author },
  source: { api: ["source.branch.name"], pick: (pr) => pr.source.name },
  destination: { api: ["destination.branch.name"], pick: (pr) => pr.destination.name },
  createdAt: { api: ["created_on"], pick: (pr) => pr.createdAt },
  updatedAt: { api: ["updated_on"], pick: (pr) => pr.updatedAt },
  url: { api: ["links.html.href"], pick: (pr) => pr.url },
  commentCount: { api: ["comment_count"], pick: (pr) => pr.commentCount },
};

const STATE_STYLE = {
  open: "green",
  merged: "magenta",
  declined: "red",
  superseded: "yellow",
} as const;

const columns = (io: ReturnType<typeof getRuntime>["io"]): Column<PullRequestSummary>[] => [
  { header: "ID", value: (pr) => String(pr.id), align: "right" },
  { header: "TITLE", value: (pr) => pr.title, flex: true, minWidth: 20 },
  { header: "BRANCH", value: (pr) => pr.source.name, flex: true, minWidth: 10 },
  {
    header: "STATE",
    value: (pr) => io.style(STATE_STYLE[pr.state], pr.state.toUpperCase()),
  },
];

export default defineBbCommand<PullRequestSummary>({
  meta: { name: "list", description: "List pull requests" },
  args: {
    state: {
      type: "string",
      description: "Filter by state: open, merged, declined, superseded, or all",
      default: "open",
    },
    limit: { type: "string", alias: "L", description: "Maximum number to fetch", default: "30" },
    author: { type: "string", description: "Filter by author UUID or account id" },
    reviewer: { type: "string", description: "Filter by reviewer UUID or account id" },
    base: { type: "string", description: "Filter by destination branch" },
    head: { type: "string", description: "Filter by source branch" },
    search: { type: "string", alias: "S", description: "Search pull-request titles" },
    sort: { type: "string", description: "Sort field, prefixed with - for descending" },
  },
  fields: FIELDS,
  examples: [
    "bb pr list --state all --limit 50",
    "bb pr list --json id,title --jq '.[] | .title'",
    "bb pr list --template '{{range .}}{{tablerow .id .title}}{{end}}{{tablerender}}'",
  ],
  async run({ args }) {
    const { io, client } = getRuntime();
    const bb = await client();
    const repo = await repoFromArgs(args);

    const rawState = String(args["state"] ?? "open");
    const state =
      rawState === "all"
        ? undefined
        : (rawState.split(",").map((value) => value.trim()) as PullRequestState[]);

    // Only ask the server for the fields this invocation will actually render.
    const selected = args["json"] as string | undefined;
    const projection =
      selected === undefined || selected === ""
        ? undefined
        : projectionFor(
            selected.split(",").map((field) => field.trim()),
            FIELDS,
          );

    const data = await collect(
      bb.pullRequests.list({
        ...repo,
        ...(state === undefined ? {} : { state }),
        limit: Number.parseInt(String(args["limit"] ?? "30"), 10),
        author: args["author"] as string | undefined,
        reviewer: args["reviewer"] as string | undefined,
        destinationBranch: args["base"] as string | undefined,
        sourceBranch: args["head"] as string | undefined,
        search: args["search"] as string | undefined,
        sort: args["sort"] as string | undefined,
        ...(projection === undefined || projection.length === 0 ? {} : { fields: projection }),
      }),
    );

    return {
      kind: "data",
      data,
      render: (rows, target) => {
        if (rows.length === 0) {
          target.info("No pull requests found.");
          return;
        }
        renderTable(rows, columns(io), target);
      },
    };
  },
});
