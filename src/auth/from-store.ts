import { readCredential, type StoredCredential } from "../config/hosts.js";
import { createAccessTokenAuth } from "./access-token.js";
import { createApiTokenAuth } from "./api-token.js";
import { resolveAuthFromEnv } from "./resolve.js";
import type { AuthStrategy } from "./types.js";

export const strategyFor = (credential: StoredCredential, source: string): AuthStrategy => {
  if (credential.kind === "access-token") {
    return createAccessTokenAuth({ token: credential.token, source });
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
