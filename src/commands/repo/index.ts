import { defineCommand } from "citty";

export default defineCommand({
  meta: { name: "repo", description: "Work with repositories" },
  subCommands: {
    list: () => import("./list.js").then((module) => module.default),
    view: () => import("./view.js").then((module) => module.default),
    clone: () => import("./clone.js").then((module) => module.default),
  },
});
