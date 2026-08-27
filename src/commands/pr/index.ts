import { defineCommand } from "citty";

export default defineCommand({
  meta: { name: "pr", description: "Work with pull requests" },
  subCommands: {
    list: () => import("./list.js").then((module) => module.default),
    view: () => import("./view.js").then((module) => module.default),
    diff: () => import("./diff.js").then((module) => module.default),
    create: () => import("./create.js").then((module) => module.default),
    checkout: () => import("./checkout.js").then((module) => module.default),
    merge: () => import("./merge.js").then((module) => module.default),
    close: () => import("./close.js").then((module) => module.default),
    ready: () => import("./ready.js").then((module) => module.default),
    review: () => import("./review.js").then((module) => module.default),
    comment: () => import("./comment.js").then((module) => module.default),
  },
});
