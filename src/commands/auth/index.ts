import { defineCommand } from "citty";

export default defineCommand({
  meta: { name: "auth", description: "Authenticate with Bitbucket" },
  subCommands: {
    status: () => import("./status.js").then((module) => module.default),
  },
});
