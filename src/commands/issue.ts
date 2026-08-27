import { defineCommand } from "citty";

import { EXIT } from "../errors.js";
import { getRuntime } from "../runtime.js";

/**
 * An explicit refusal rather than a missing command.
 *
 * Atlassian removed the Bitbucket issue tracker API entirely — the endpoints return
 * HTTP 410 and the schema is gone from the published OpenAPI spec. Saying so plainly
 * is more useful than "unknown command", and it saves anyone coming from `gh` the time
 * they would otherwise spend looking for the flag they got wrong.
 */
export default defineCommand({
  meta: { name: "issue", description: "(removed by Atlassian — see `bb issue`)" },
  run() {
    const { io } = getRuntime();
    io.error("Bitbucket removed the issue tracker API (HTTP 410).");
    io.info("  There is no `bb issue` command and there cannot be one.");
    io.info("  Atlassian's migration path is Jira.");
    process.exitCode = EXIT.gone;
  },
});
