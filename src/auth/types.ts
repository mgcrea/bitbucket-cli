export type AuthKind = "api-token" | "access-token" | "oauth" | "anonymous";

export type AuthScope =
  | { type: "user" }
  | { type: "workspace"; workspace?: string }
  | { type: "project"; workspace?: string; project?: string }
  | { type: "repository"; workspace?: string; repository?: string }
  | { type: "none" };

/**
 * What a credential can actually do.
 *
 * This exists because Bitbucket's credential types are not interchangeable. A
 * repository, project or workspace access token is not associated with an Atlassian
 * account at all, so `GET /user` returns 401 and everything built on identity —
 * `--author @me`, `bb pr status`, `bb status` — is structurally unavailable. Knowing
 * that up front is what lets the CLI explain rather than just fail.
 */
export type AuthCapabilities = {
  /** `GET /user` works. False for repository/project/workspace access tokens. */
  readonly hasUserIdentity: boolean;
  /** Deploy-key endpoints are reachable. Blocked for resource access tokens. */
  readonly canManageDeployKeys: boolean;
  readonly scope: AuthScope;
};

export type AuthHeaders = Readonly<Record<string, string>>;

/**
 * Credentials for git over HTTPS, which does NOT use the same username as REST.
 *
 * REST with an Atlassian API token authenticates as the account *email*; git wants the
 * Bitbucket *username* (case-sensitive) or the literal `x-bitbucket-api-token-auth`.
 * OAuth and access tokens use `x-token-auth`. Conflating them produces a 403 on push
 * that looks nothing like an auth-setup mistake.
 */
export type GitCredentials = { username: string; password: string };

export type AuthStrategy = {
  readonly kind: AuthKind;
  readonly capabilities: AuthCapabilities;
  /** Called per request; may refresh an expiring token. */
  authorize(context: { method: string; url: string }): Promise<AuthHeaders>;
  /** Called on a 401. Drops stale state; resolves true if a retry is worthwhile. */
  invalidate(): Promise<boolean>;
  /**
   * Async because an OAuth credential may have to refresh before it can answer. The
   * other strategies hold a static secret and resolve immediately, but the git
   * credential helper has to be able to await the one that does not — a cold OAuth
   * cache returning `undefined` would make git fall back to prompting.
   */
  gitCredentials(): Promise<GitCredentials | undefined>;
  /** Which env var or file this came from, for `bb auth status`. */
  readonly source?: string | undefined;
};
