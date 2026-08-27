import { defineCommand } from "citty";

export default defineCommand({
  meta: { name: "auth", description: "Authenticate with Bitbucket" },
  subCommands: {
    login: () => import("./login.js").then((module) => module.default),
    logout: () => import("./logout.js").then((module) => module.default),
    status: () => import("./status.js").then((module) => module.default),
    "git-credential": () => import("./git-credential.js").then((module) => module.default),
  },
});
