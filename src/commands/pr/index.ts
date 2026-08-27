import { defineCommand } from "citty";

export default defineCommand({
  meta: { name: "pr", description: "Work with pull requests" },
  subCommands: {
    list: () => import("./list.js").then((module) => module.default),
    view: () => import("./view.js").then((module) => module.default),
    diff: () => import("./diff.js").then((module) => module.default),
  },
});
