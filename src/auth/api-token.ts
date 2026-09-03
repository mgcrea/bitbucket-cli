import type { AuthStrategy, GitCredentials } from "./types.js";

export type ApiTokenAuthOptions = {
  token: string;
  /** The Atlassian account email. Required for Basic transport. */
  email?: string | undefined;
  /**
   * Basic sends `email:token`; Bearer sends the token alone. Bearer only became
   * supported on 2026-08-18, so Basic is the default where an email is available.
   */
  transport?: "basic" | "bearer" | undefined;
  /** The Bitbucket username, which git over HTTPS wants instead of the email. */
  username?: string | undefined;
  source?: string | undefined;
};

/**
 * An Atlassian account API token, scoped to Bitbucket.
 *
 * Note this must be a token created with "Bitbucket" selected as the app — a plain
 * unscoped Atlassian API token authenticates but is rejected by the Bitbucket API.
 */
export const createApiTokenAuth = (options: ApiTokenAuthOptions): AuthStrategy => {
  const transport = options.transport ?? (options.email === undefined ? "bearer" : "basic");
  if (transport === "basic" && options.email === undefined) {
    throw new TypeError("Basic transport needs the Atlassian account email");
  }

  const header =
    transport === "basic"
      ? `Basic ${Buffer.from(`${options.email ?? ""}:${options.token}`).toString("base64")}`
      : `Bearer ${options.token}`;

  return {
    kind: "api-token",
    capabilities: {
      hasUserIdentity: true,
      canManageDeployKeys: true,
      scope: { type: "user" },
    },
    authorize: () => Promise.resolve({ authorization: header }),
    // An API token cannot be refreshed. Atlassian tokens are not viewable after
    // creation and cannot be edited, so recovery is create-a-new-one, not retry.
    invalidate: () => Promise.resolve(false),
    gitCredentials: (): Promise<GitCredentials> =>
      Promise.resolve({
        // Git over HTTPS wants the Bitbucket username, not the Atlassian email. The
        // static form works for any account and avoids having to resolve one.
        username: options.username ?? "x-bitbucket-api-token-auth",
        password: options.token,
      }),
    ...(options.source === undefined ? {} : { source: options.source }),
  };
};
