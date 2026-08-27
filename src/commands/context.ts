import type { BbArgs } from "../command.js";
import { UsageError } from "../errors.js";
import { resolveRepoContext } from "../git/context.js";
import { BitbucketError } from "../http/errors.js";

/**
 * Resolves the repository a command should act on.
 *
 * Precedence: `--repo`, then `BB_REPO`, then `git config bb.repo`, then the git
 * remotes. Failures are turned into usage errors naming the flag to pass, because
 * "no repository" is almost always a missing flag rather than a broken environment.
 */
export const repoFromArgs = async (
  args: BbArgs,
): Promise<{ workspace: string; repository: string }> => {
  const override = args["repo"] as string | undefined;
  try {
    const context = await resolveRepoContext(
      override === undefined || override === "" ? {} : { override },
    );
    return { workspace: context.workspace, repository: context.repository };
  } catch (error) {
    // Keep the hint: it names the flag to pass, which is the actionable half.
    const hint = error instanceof BitbucketError ? error.hint : undefined;
    throw new UsageError(error instanceof Error ? error.message : String(error), hint);
  }
};

export const workspaceFromArgs = (args: BbArgs): string => {
  const workspace =
    (args["workspace"] as string | undefined) ??
    process.env["BB_WORKSPACE"] ??
    process.env["BITBUCKET_WORKSPACE"];
  if (workspace === undefined || workspace === "") {
    throw new UsageError(
      "No workspace given. Pass --workspace, or set BB_WORKSPACE.\n" +
        "Bitbucket removed the endpoint that listed repositories across all workspaces.",
    );
  }
  return workspace;
};
