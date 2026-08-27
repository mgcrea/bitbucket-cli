import { defineBbCommand } from "../../command.js";
import { UsageError } from "../../errors.js";
import { runGit } from "../../git/exec.js";
import { getRuntime } from "../../runtime.js";
import { repoFromArgs } from "../context.js";
import { resolvePullRequestId } from "./id.js";

export default defineBbCommand<never>({
  meta: { name: "checkout", description: "Check out the branch of a pull request" },
  args: {
    id: { type: "positional", description: "Pull request number", required: true },
    branch: { type: "string", alias: "b", description: "Local branch name to use" },
    detach: { type: "boolean", description: "Check out the head commit detached" },
    force: {
      type: "boolean",
      alias: "f",
      description: "Reset the local branch to the remote head",
    },
  },
  examples: ["bb pr checkout 42", "bb pr checkout 42 -b review/42"],
  async run({ args }) {
    const { io, client } = getRuntime();
    const bb = await client();
    const repo = await repoFromArgs(args);
    const id = await resolvePullRequestId(args, bb, repo);
    const pr = await bb.pullRequests.get({ ...repo, id });

    const sourceBranch = pr.source.name;
    const sourceRepo = pr.source.repository;
    const local = (args["branch"] as string | undefined) ?? sourceBranch;
    const isFork =
      sourceRepo !== undefined && sourceRepo !== `${repo.workspace}/${repo.repository}`;

    // Bitbucket has no `refs/pull/N/head`, so a fork's branch is not reachable through
    // origin at all — it has to be fetched from the fork's own URL.
    if (sourceBranch === "" || pr.source.commit === undefined) {
      throw new UsageError(
        `Pull request #${id} has no source branch available.`,
        "Its branch was probably deleted after merging.",
      );
    }

    if (args["detach"] === true) {
      const url = isFork ? `https://bitbucket.org/${sourceRepo}.git` : "origin";
      await runGit(["fetch", url, pr.source.commit]);
      await runGit(["checkout", "--detach", pr.source.commit]);
      io.info(`Checked out ${pr.source.commit.slice(0, 8)} detached.`);
      return { kind: "none" };
    }

    if (isFork) {
      const url = `https://bitbucket.org/${sourceRepo}.git`;
      await runGit([
        "fetch",
        url,
        `${sourceBranch}:${local}`,
        ...(args["force"] === true ? ["--force"] : []),
      ]);
      await runGit(["checkout", local]);
      // Point the local branch at the fork so a later `git push` reaches the right
      // place, without leaving a permanent remote behind.
      await runGit(["config", `branch.${local}.remote`, url]);
      await runGit(["config", `branch.${local}.merge`, `refs/heads/${sourceBranch}`]);
      io.info(`Checked out ${local} from ${sourceRepo} (fork).`);
      return { kind: "none" };
    }

    // Explicit refspec so the remote-tracking ref exists even in a shallow or
    // single-branch clone, whose narrow remote.origin.fetch would not create it.
    await runGit([
      "fetch",
      "origin",
      `+refs/heads/${sourceBranch}:refs/remotes/origin/${sourceBranch}`,
    ]);
    // Branch from FETCH_HEAD rather than origin/<branch>: a shallow or single-branch
    // clone has a narrow remote.origin.fetch refspec, so the remote-tracking ref either
    // does not exist or is not considered a branch, and `--track` fails on it.
    await runGit(["checkout", args["force"] === true ? "-B" : "-b", local, "FETCH_HEAD"]).catch(
      async (error: unknown) => {
        // Already checked out from an earlier run, which is not a failure.
        await runGit(["checkout", local]).catch(() => {
          throw error;
        });
      },
    );

    // Set the upstream by config rather than --set-upstream-to, for the same reason.
    // This is all `git push` needs. Note that `@{upstream}` additionally requires the
    // branch to be covered by remote.origin.fetch, so it stays unresolved in a
    // --single-branch clone; pushing still works there.
    await runGit(["config", `branch.${local}.remote`, "origin"]);
    await runGit(["config", `branch.${local}.merge`, `refs/heads/${sourceBranch}`]);

    io.info(`Checked out ${local}, tracking origin/${sourceBranch}.`);
    return { kind: "none" };
  },
});
