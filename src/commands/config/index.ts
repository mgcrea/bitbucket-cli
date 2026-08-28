import { defineCommand } from "citty";

export default defineCommand({
  meta: { name: "config", description: "Manage bb settings" },
  subCommands: {
    get: () => import("./get.js").then((module) => module.default),
    set: () => import("./set.js").then((module) => module.default),
    list: () => import("./list.js").then((module) => module.default),
  },
});
