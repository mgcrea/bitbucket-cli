import { defineBbCommand } from "../../command.js";
import { readConfig } from "../../config/config.js";
import { UsageError } from "../../errors.js";
import { runGit } from "../../git/exec.js";
import { parseRepoSpec } from "../../git/remote.js";
import { getRuntime } from "../../runtime.js";

/**
 * Points git at this same binary as a credential helper, for the clone only.
 *
 * The alternative — putting the token in the clone URL — writes it into
 * `.git/config` as remote.origin.url and leaves it in shell history and `ps`. This
 * keeps it out of both, and does not touch the user's global git config the way
 * `auth setup-git` would.
 */
const credentialHelper = (): string[] => {
  const bin = process.argv[1];
  if (bin === undefined) {
    return [];
  }
  // `!` marks a shell command; the path is quoted because it can contain spaces.
  return ["-c", `credential.helper=!'${process.execPath}' '${bin}' auth git-credential`];
};

export default defineBbCommand<never>({
  meta: { name: "clone", description: "Clone a repository" },
  args: {
    repository: { type: "positional", description: "workspace/repo", required: true },
    directory: { type: "positional", description: "Target directory", required: false },
    protocol: {
      type: "string",
      alias: "p",
      description: "ssh or https (default: the git_protocol setting, else https)",
    },
    upstream: {
      type: "boolean",
      description: "Also add the parent repository as an `upstream` remote, if it is a fork",
    },
  },
  examples: ["bb repo clone acme/api", "bb repo clone acme/api ./api -p ssh"],
  async run({ args }) {
    const { io, client } = getRuntime();
    const spec = String(args["repository"]);
    const ref = parseRepoSpec(spec);
    const bb = await client();

    const repo = await bb.repositories.get(ref);
    const protocol =
      (args["protocol"] as string | undefined) ?? (await readConfig()).git_protocol ?? "https";
    if (protocol !== "https" && protocol !== "ssh") {
      throw new UsageError(`Unknown protocol ${JSON.stringify(protocol)}. Use ssh or https.`);
    }

    const url = protocol === "ssh" ? repo.cloneUrls.ssh : repo.cloneUrls.https;
    if (url === undefined) {
      throw new UsageError(`${repo.fullName} exposes no ${protocol} clone URL.`);
    }

    const directory = args["directory"] as string | undefined;
    const passthrough = getRuntime().passthrough;

    io.info(`Cloning ${repo.fullName}…`);
    await runGit(
      [
        // ssh authenticates on its own, so the helper is only wired up for https.
        ...(protocol === "https" ? credentialHelper() : []),
        "clone",
        url,
        ...(directory === undefined ? [] : [directory]),
        ...passthrough,
      ],
      { timeoutMs: 600_000 },
    );

    return { kind: "none" };
  },
});
