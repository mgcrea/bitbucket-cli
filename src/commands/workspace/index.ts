import { defineCommand } from "citty";

export default defineCommand({
  meta: { name: "workspace", description: "Work with workspaces" },
  subCommands: {
    list: () => import("./list.js").then((module) => module.default),
  },
});
