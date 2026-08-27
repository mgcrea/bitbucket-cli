import { readFile } from "node:fs/promises";

import { defineBbCommand } from "../../command.js";
import { UsageError } from "../../errors.js";
import type { PullRequestComment } from "../../flavor/domain.js";
import type { FieldMap } from "../../output/fields.js";
import { getRuntime } from "../../runtime.js";
import { repoFromArgs } from "../context.js";
import { resolvePullRequestId } from "./id.js";

const FIELDS: FieldMap<PullRequestComment> = {
  id: { pick: (comment) => comment.id },
  content: { pick: (comment) => comment.content },
  author: { pick: (comment) => comment.author },
  createdAt: { pick: (comment) => comment.createdAt },
  inline: { pick: (comment) => comment.inline },
  parentId: { pick: (comment) => comment.parentId },
};

export default defineBbCommand<PullRequestComment>({
  meta: { name: "comment", description: "Comment on a pull request" },
  args: {
    id: {
      type: "positional",
      description: "Pull request number (default: the current branch's)",
      required: false,
    },
    body: { type: "string", alias: "b", description: "Comment text" },
    "body-file": {
      type: "string",
      alias: "F",
      description: "Read the comment from a file, or - for stdin",
    },
    path: { type: "string", description: "Anchor the comment to a file in the diff" },
    line: { type: "string", description: "Line in the new file (needs --path)" },
    "reply-to": { type: "string", description: "Reply to an existing comment id" },
    list: {
      type: "boolean",
      alias: "l",
      description: "List existing comments instead of adding one",
    },
  },
  fields: FIELDS,
  examples: [
    "bb pr comment -b 'looks good'",
    "bb pr comment 42 --path src/app.ts --line 12 -b 'this leaks'",
    "bb pr comment 42 --list",
  ],
  async run({ args }) {
    const bb = await getRuntime().client();
    const repo = await repoFromArgs(args);
    const id = await resolvePullRequestId(args, bb, repo);
    const ref = { ...repo, id };

    if (args["list"] === true) {
      const { collect } = await import("../../pagination/collect.js");
      const comments = (await collect(bb.pullRequests.comments(ref))).filter(
        (comment) => !comment.deleted,
      );
      return {
        kind: "data",
        data: comments,
        render: (rows, io) => {
          if (rows.length === 0) {
            io.info("No comments.");
            return;
          }
          for (const comment of rows) {
            const anchor =
              comment.inline === undefined
                ? ""
                : io.style("dim", ` ${comment.inline.path}:${comment.inline.to ?? "?"}`);
            io.out(`${io.style("bold", comment.author.displayName)}${anchor}`);
            io.out(comment.content.trimEnd());
            io.out("");
          }
        },
      };
    }

    let body = args["body"] as string | undefined;
    const bodyFile = args["body-file"] as string | undefined;
    if (bodyFile !== undefined) {
      body = bodyFile === "-" ? await readStdin() : await readFile(bodyFile, "utf8");
    }
    if (body === undefined || body.trim() === "") {
      throw new UsageError("A comment body is required.", "Pass --body or --body-file.");
    }

    const path = args["path"] as string | undefined;
    const line = args["line"] as string | undefined;
    if (line !== undefined && path === undefined) {
      throw new UsageError(
        "--line needs --path.",
        "Bitbucket anchors an inline comment to a file.",
      );
    }

    const comment = await bb.pullRequests.addComment(ref, {
      body,
      parentId: args["reply-to"] === undefined ? undefined : Number(args["reply-to"]),
      ...(path === undefined
        ? {}
        : { inline: { path, to: line === undefined ? undefined : Number(line) } }),
    });

    return {
      kind: "data",
      data: [comment],
      render: ([only], io) => {
        if (only !== undefined) {
          io.info(`Added comment ${only.id} to #${id}.`);
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
