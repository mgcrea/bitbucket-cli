import { openBrowser } from "../browser.js";
import { defineBbCommand } from "../command.js";
import { UsageError } from "../errors.js";
import { currentBranch } from "../git/log.js";
import { getRuntime } from "../runtime.js";
import { repoFromArgs } from "./context.js";

type Browsed = { url: string };

export default defineBbCommand<Browsed>({
  meta: { name: "browse", description: "Open the repository in a browser" },
  args: {
    target: {
      type: "positional",
      description: "A file path, or a pull-request number with --pr",
      required: false,
    },
    pr: { type: "string", description: "Open a pull request by number" },
    branch: { type: "string", alias: "b", description: "Open a branch (default: the current one)" },
    commit: { type: "string", alias: "c", description: "Open a commit by hash" },
    pipelines: { type: "boolean", description: "Open the pipelines page" },
    settings: { type: "boolean", description: "Open the repository settings" },
    "no-browser": {
      type: "boolean",
      alias: "n",
      description: "Print the URL instead of opening it",
    },
  },
  fields: { url: { pick: (browsed) => browsed.url } },
  examples: ["bb browse", "bb browse --pr 42", "bb browse src/index.ts", "bb browse -n | pbcopy"],
  async run({ args }) {
    const { io } = getRuntime();
    const repo = await repoFromArgs(args);
    const base = `https://bitbucket.org/${repo.workspace}/${repo.repository}`;

    const target = args["target"] as string | undefined;
    const pr = args["pr"] as string | undefined;
    const branch = args["branch"] as string | undefined;
    const commit = args["commit"] as string | undefined;

    let url = base;
    if (pr !== undefined) {
      if (!/^\d+$/.test(pr)) {
        throw new UsageError(`Expected a pull-request number, got ${JSON.stringify(pr)}`);
      }
      url = `${base}/pull-requests/${pr}`;
    } else if (commit !== undefined) {
      url = `${base}/commits/${commit}`;
    } else if (args["pipelines"] === true) {
      url = `${base}/pipelines`;
    } else if (args["settings"] === true) {
      url = `${base}/admin`;
    } else if (target !== undefined) {
      // A file is only addressable at a ref, so fall back to the current branch.
      const ref = branch ?? (await currentBranch()) ?? "HEAD";
      url = `${base}/src/${encodeURIComponent(ref)}/${target.split("/").map(encodeURIComponent).join("/")}`;
    } else if (branch !== undefined) {
      url = `${base}/branch/${encodeURIComponent(branch)}`;
    }

    // Printing rather than opening is what makes this usable in CI and pipeable.
    if (args["no-browser"] === true || !io.isTTY) {
      return {
        kind: "data",
        data: [{ url }],
        single: true,
        render: ([only], target_) => {
          if (only !== undefined) target_.out(only.url);
        },
      };
    }

    // openBrowser reports failure rather than throwing, so a headless box falls back
    // to printing the URL instead of erroring.
    const opened = await openBrowser(url);
    return {
      kind: "data",
      data: [{ url }],
      single: true,
      render: ([only], target_) => {
        if (only === undefined) {
          return;
        }
        if (opened) {
          target_.info(`Opening ${only.url}`);
        } else {
          target_.out(only.url);
        }
      },
    };
  },
});
