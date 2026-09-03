import type { AuthStrategy } from "./types.js";

export const createAnonymousAuth = (): AuthStrategy => ({
  kind: "anonymous",
  capabilities: {
    hasUserIdentity: false,
    canManageDeployKeys: false,
    scope: { type: "none" },
  },
  authorize: () => Promise.resolve({}),
  invalidate: () => Promise.resolve(false),
  gitCredentials: () => Promise.resolve(undefined),
});
