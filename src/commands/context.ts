import type { BbArgs } from "../command.js";
import { readConfig } from "../config/config.js";
import { UsageError } from "../errors.js";
import { resolveRepoContext } from "../git/context.js";
import type { GitOptions } from "../git/exec.js";
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

/**
 * Resolves the workspace a command should act on.
 *
 * Precedence: `--workspace`, `BB_WORKSPACE`, the current clone's remote, then
 * `default_workspace` from the config file. Inference beats the config file
 * deliberately — inside a clone of `acme/api`, `bb repo list` should list `acme`,
 * not whichever workspace you happened to set as a default months ago.
 */
export const workspaceFromArgs = async (
  args: BbArgs,
  // Exists so a test can point the inference step at a directory it controls; without
  // it, this function's result would depend on wherever the suite happens to run.
  options: GitOptions = {},
): Promise<string> => {
  const flag = args["workspace"] as string | undefined;
  const fromEnv = process.env["BB_WORKSPACE"] ?? process.env["BITBUCKET_WORKSPACE"];
  const explicit = flag !== undefined && flag !== "" ? flag : fromEnv;
  if (explicit !== undefined && explicit !== "") {
    return explicit;
  }

  // Only reached when nothing was passed, so the `git` spawn stays off the path any
  // scripted invocation takes.
  const inferred = await resolveRepoContext(options).then(
    (context) => context.workspace,
    () => undefined,
  );
  if (inferred !== undefined) {
    return inferred;
  }

  const fromConfig = (await readConfig()).default_workspace;
  if (fromConfig !== undefined && fromConfig !== "") {
    return fromConfig;
  }

  throw new UsageError(
    "No workspace given. Pass --workspace, or set BB_WORKSPACE.",
    "Bitbucket removed the endpoint that listed repositories across all workspaces,\n" +
      "  so every listing is workspace-scoped. Run `bb workspace list` to see yours,\n" +
      "  then `bb config set default_workspace <name>` to make one the default.",
  );
};
