import { defineCommand } from "citty";

import { VERSION } from "../version.js";

/**
 * The command table. Every entry is a lazy import, so `bb pr list` resolves two module
 * factories rather than the whole tree — which is most of why startup stays at the
 * Node floor.
 */
export const rootCommand = defineCommand({
  meta: {
    name: "bb",
    version: VERSION,
    description: "Work with Bitbucket from the command line",
  },
  subCommands: {
    auth: () => import("./auth/index.js").then((module) => module.default),
    pr: () => import("./pr/index.js").then((module) => module.default),
    repo: () => import("./repo/index.js").then((module) => module.default),
    api: () => import("./api.js").then((module) => module.default),
    issue: () => import("./issue.js").then((module) => module.default),
  },
});

export default rootCommand;
