import { defineBbCommand } from "../../command.js";
import type { PullRequestSummary } from "../../flavor/domain.js";
import { currentBranch } from "../../git/log.js";
import { CapabilityError } from "../../http/errors.js";
import type { FieldMap } from "../../output/fields.js";
import { collect } from "../../pagination/collect.js";
import { getRuntime } from "../../runtime.js";
import { repoFromArgs } from "../context.js";

type Section = "current" | "created" | "review-requested";

type StatusRow = PullRequestSummary & { section: Section };

const FIELDS: FieldMap<StatusRow> = {
  section: { pick: (pr) => pr.section },
  id: { pick: (pr) => pr.id },
  title: { pick: (pr) => pr.title },
  state: { pick: (pr) => pr.state },
  draft: { pick: (pr) => pr.draft },
  author: { pick: (pr) => pr.author },
  source: { pick: (pr) => pr.source.name },
  destination: { pick: (pr) => pr.destination.name },
  updatedAt: { pick: (pr) => pr.updatedAt },
  url: { pick: (pr) => pr.url },
};

const tag = (prs: readonly PullRequestSummary[], section: Section): StatusRow[] =>
  prs.map((pr) => Object.assign({ section }, pr));

const HEADINGS: Record<Section, string> = {
  current: "Current branch",
  created: "Created by you",
  "review-requested": "Requesting your review",
};

export default defineBbCommand<StatusRow>({
  meta: { name: "status", description: "Show pull requests relevant to you" },
  args: {
    limit: { type: "string", alias: "L", description: "Maximum per section", default: "10" },
  },
  fields: FIELDS,
  examples: ["bb pr status", "bb pr status --json section,id,title"],
  async run({ args }) {
    const bb = await getRuntime().client();
    const repo = await repoFromArgs(args);
    const limit = Number.parseInt(String(args["limit"] ?? "10"), 10);

    // Every pane is keyed on "you", so this needs an account. A repository or workspace
    // access token has none, and CapabilityError says so before any request is made.
    const me = await bb.users.current().catch((error: unknown) => {
      if (error instanceof CapabilityError) {
        throw new CapabilityError(
          error.capability,
          error.authKind,
          "`bb pr status` is built around who you are, so it needs a credential with an " +
            "account.\n  Log in with an Atlassian API token, or use `bb pr list` instead.",
        );
      }
      throw error;
    });

    const author = me.uuid ?? me.accountId;
    const branch = await currentBranch();

    const [current, created, reviewing] = await Promise.all([
      branch === undefined
        ? Promise.resolve([])
        : collect(
            bb.pullRequests.list({ ...repo, state: ["open"], sourceBranch: branch, limit: 1 }),
          ),
      author === undefined
        ? Promise.resolve([])
        : collect(bb.pullRequests.list({ ...repo, state: ["open"], author, limit })),
      author === undefined
        ? Promise.resolve([])
        : collect(bb.pullRequests.list({ ...repo, state: ["open"], reviewer: author, limit })),
    ]);

    const rows: StatusRow[] = [
      ...tag(current, "current"),
      ...tag(created, "created"),
      // A pull request you opened yourself is not something you are reviewing.
      ...tag(
        reviewing.filter((pr) => pr.author.uuid !== author),
        "review-requested",
      ),
    ];

    return {
      kind: "data",
      data: rows,
      render: (all, io) => {
        for (const section of ["current", "created", "review-requested"] as const) {
          const matching = all.filter((pr) => pr.section === section);
          io.out(io.style("bold", HEADINGS[section]));
          if (matching.length === 0) {
            io.out(io.style("dim", "  nothing"));
          }
          for (const pr of matching) {
            io.out(
              `  ${io.style("green", `#${pr.id}`)} ${pr.title}` +
                io.style("dim", `  ${pr.source.name} → ${pr.destination.name}`),
            );
          }
          io.out("");
        }
      },
    };
  },
});
