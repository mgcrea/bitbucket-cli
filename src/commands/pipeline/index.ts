import { defineCommand } from "citty";

export default defineCommand({
  meta: { name: "pipeline", description: "Work with Bitbucket Pipelines" },
  subCommands: {
    list: () => import("./list.js").then((module) => module.default),
    view: () => import("./view.js").then((module) => module.default),
    log: () => import("./log.js").then((module) => module.default),
    run: () => import("./run.js").then((module) => module.default),
    stop: () => import("./stop.js").then((module) => module.default),
  },
});
