import { readCredential, type StoredCredential } from "../config/hosts.js";
import { createAccessTokenAuth } from "./access-token.js";
import { createApiTokenAuth } from "./api-token.js";
import { OAuthError } from "./oauth-flow.js";
import { createOAuthAuth, hostsTokenStore } from "./oauth.js";
import { resolveAuthFromEnv } from "./resolve.js";
import type { AuthStrategy } from "./types.js";

export const strategyFor = (
  credential: StoredCredential,
  source: string,
  env: NodeJS.ProcessEnv = process.env,
): AuthStrategy => {
  if (credential.kind === "access-token") {
    return createAccessTokenAuth({ token: credential.token, source });
  }
  if (credential.kind === "oauth") {
    // The consumer pair comes from the store first — `bb auth login --web` puts it
    // there — and from the environment second, so a CI job can supply the secret
    // without one on disk.
    const clientId = credential.clientId ?? env["BB_OAUTH_CLIENT_ID"];
    const clientSecret = credential.clientSecret ?? env["BB_OAUTH_CLIENT_SECRET"];
    if (clientId === undefined || clientSecret === undefined) {
      throw new OAuthError("The stored OAuth login is missing its consumer credentials.", {
        hint:
          "Set BB_OAUTH_CLIENT_ID and BB_OAUTH_CLIENT_SECRET, or run `bb auth login --web` " +
          "again to store them.",
      });
    }
    return createOAuthAuth({ clientId, clientSecret, store: hostsTokenStore(env), source });
  }
  return createApiTokenAuth({
    token: credential.token,
    email: credential.email,
    username: credential.username,
    transport: credential.email === undefined ? "bearer" : "basic",
    source,
  });
};

/**
 * Environment first, then the stored credential.
 *
 * The env always wins and is never written to disk, which is what makes CI work with
 * no setup step and what lets someone override a stored login for a single command.
 */
export const resolveAuth = async (env: NodeJS.ProcessEnv = process.env): Promise<AuthStrategy> => {
  const fromEnv = resolveAuthFromEnv();
  if (fromEnv.kind !== "anonymous") {
    return fromEnv;
  }
  const stored = await readCredential(undefined, env);
  return stored === undefined ? fromEnv : strategyFor(stored, "~/.config/bb/hosts.yml");
};
