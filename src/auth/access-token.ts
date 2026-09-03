import type { AuthScope, AuthStrategy, GitCredentials } from "./types.js";

export type AccessTokenAuthOptions = {
  token: string;
  /** What the token is scoped to, when config records it. */
  scope?: AuthScope | undefined;
  source?: string | undefined;
};

/**
 * A repository, project or workspace access token.
 *
 * These are not tied to an Atlassian account. They appear in API responses as a
 * pseudo-user named after the token, `GET /user` returns 401, and the deploy-key
 * endpoints reject them outright. Declaring those limits up front is what lets the CLI
 * explain the restriction instead of surfacing a bare 401.
 */
export const createAccessTokenAuth = (options: AccessTokenAuthOptions): AuthStrategy => ({
  kind: "access-token",
  capabilities: {
    hasUserIdentity: false,
    canManageDeployKeys: false,
    scope: options.scope ?? { type: "none" },
  },
  authorize: () => Promise.resolve({ authorization: `Bearer ${options.token}` }),
  invalidate: () => Promise.resolve(false),
  gitCredentials: (): Promise<GitCredentials> =>
    Promise.resolve({
      username: "x-token-auth",
      password: options.token,
    }),
  ...(options.source === undefined ? {} : { source: options.source }),
});
