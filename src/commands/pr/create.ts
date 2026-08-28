import { readFile } from "node:fs/promises";

import { defineBbCommand } from "../../command.js";
import { UsageError } from "../../errors.js";
import type { PullRequest } from "../../flavor/domain.js";
import { runGit } from "../../git/exec.js";
import { buildPullRequestDraft } from "../../git/fill.js";
import { commitsBetween, currentBranch, mergeBase, remoteHasBranch } from "../../git/log.js";
import type { FieldMap } from "../../output/fields.js";
import { getRuntime } from "../../runtime.js";
import { repoFromArgs } from "../context.js";

const FIELDS: FieldMap<PullRequest> = {
  id: { pick: (pr) => pr.id },
  title: { pick: (pr) => pr.title },
  state: { pick: (pr) => pr.state },
  draft: { pick: (pr) => pr.draft },
  source: { pick: (pr) => pr.source },
  destination: { pick: (pr) => pr.destination },
  url: { pick: (pr) => pr.url },
};

export default defineBbCommand<PullRequest>({
  meta: { name: "create", description: "Create a pull request" },
  args: {
    title: { type: "string", alias: "t", description: "Pull request title" },
    body: { type: "string", alias: "b", description: "Pull request description" },
    "body-file": {
      type: "string",
      alias: "F",
      description: "Read the description from a file, or - for stdin",
    },
    fill: {
      type: "boolean",
      alias: "f",
      description: "Derive title and body from the commits on this branch",
    },
    "fill-first": { type: "boolean", description: "Like --fill, but use only the first commit" },
    base: {
      type: "string",
      alias: "B",
      description: "Destination branch (default: the repo's main branch)",
    },
    head: {
      type: "string",
      alias: "H",
      description: "Source branch (default: the current branch)",
    },
    draft: { type: "boolean", alias: "d", description: "Create as a draft" },
    reviewer: {
      type: "string",
      alias: "r",
      description: "Reviewer UUID or account id (repeatable)",
    },
    "close-source-branch": {
      type: "boolean",
      description: "Delete the source branch after merging",
    },
    push: { type: "boolean", description: "Push the source branch first if the remote lacks it" },
  },
  fields: FIELDS,
  examples: [
    "bb pr create --fill",
    "bb pr create -t 'Add OAuth' -b 'Closes AI-42' --draft",
    "bb pr create --fill --json url --jq '.[0].url'",
  ],
  async run({ args }) {
    const { io, client } = getRuntime();
    const bb = await client();
    const repo = await repoFromArgs(args);

    const head = (args["head"] as string | undefined) ?? (await currentBranch());
    if (head === undefined) {
      throw new UsageError(
        "HEAD is detached, so there is no branch to open a pull request from.",
        "Check out a branch, or pass --head <branch>.",
      );
    }

    // The API is authoritative for the default branch; `origin/HEAD` is routinely stale.
    const base =
      (args["base"] as string | undefined) ?? (await bb.repositories.defaultBranch(repo));
    if (head === base) {
      throw new UsageError(`The source and destination branches are both ${JSON.stringify(head)}.`);
    }

    let title = args["title"] as string | undefined;
    let body = args["body"] as string | undefined;

    const bodyFile = args["body-file"] as string | undefined;
    if (bodyFile !== undefined) {
      body = bodyFile === "-" ? await readStdin() : await readFile(bodyFile, "utf8");
    }

    if (args["fill"] === true || args["fill-first"] === true) {
      const commits = await commitsBetween(await mergeBase(`origin/${base}`, "HEAD"), "HEAD").catch(
        () => [],
      );
      if (commits.length === 0) {
        throw new UsageError(
          `No commits found between origin/${base} and HEAD.`,
          "Commit something first, or pass --title explicitly.",
        );
      }
      const draft = buildPullRequestDraft(
        args["fill-first"] === true ? [commits.at(-1) ?? commits[0]!] : commits,
        head,
      );
      title ??= draft.title;
      body ??= draft.description;
    }

    // Every prompt has a flag equivalent, and a missing value names the flag rather
    // than blocking on stdin — that is what stops this deadlocking in CI.
    if (title === undefined || title === "") {
      throw new UsageError(
        "A title is required.",
        "Pass --title, or --fill to derive one from your commits.",
      );
    }

    if (!(await remoteHasBranch("origin", head))) {
      if (args["push"] !== true) {
        throw new UsageError(
          `origin has no branch ${JSON.stringify(head)}.`,
          "Push it first, or re-run with --push.",
        );
      }
      io.info(`Pushing ${head} to origin…`);
      await runGit(["push", "--set-upstream", "origin", head]);
    }

    const reviewers = ([] as string[]).concat(
      (args["reviewer"] as string | string[] | undefined) ?? [],
    );

    const pr = await bb.pullRequests.create(repo, {
      title,
      description: body,
      sourceBranch: head,
      destinationBranch: base,
      draft: args["draft"] === true ? true : undefined,
      closeSourceBranch: args["close-source-branch"] === true ? true : undefined,
      ...(reviewers.length === 0 ? {} : { reviewers }),
    });

    return {
      kind: "data",
      data: [pr],
      single: true,
      render: ([only], target) => {
        if (only !== undefined) {
          target.out(only.url);
        }
      },
    };
  },
});

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk as Buffer));
  }
  return Buffer.concat(chunks).toString("utf8");
};
