import { defineBbCommand } from "../../command.js";
import { deleteCredential } from "../../config/hosts.js";
import { getRuntime } from "../../runtime.js";

export default defineBbCommand<never>({
  meta: { name: "logout", description: "Remove the stored credential" },
  async run() {
    const { io } = getRuntime();

    if (process.env["BB_TOKEN"] !== undefined || process.env["BITBUCKET_TOKEN"] !== undefined) {
      // Say so rather than pretending: the env credential is what is actually in use,
      // and removing a stored one would not change anything.
      io.warn("BB_TOKEN is set in the environment and takes precedence.");
      io.info("  Unset it to stop authenticating with it.");
    }

    io.info(
      (await deleteCredential())
        ? "Removed the stored credential for bitbucket.org."
        : "No stored credential to remove.",
    );
    return { kind: "none" };
  },
});
