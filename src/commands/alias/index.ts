import { defineCommand } from "citty";

export default defineCommand({
  meta: { name: "alias", description: "Manage command shortcuts" },
  subCommands: {
    set: () => import("./set.js").then((module) => module.default),
    list: () => import("./list.js").then((module) => module.default),
    delete: () => import("./delete.js").then((module) => module.default),
  },
});
