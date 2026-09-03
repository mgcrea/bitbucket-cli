import { readCredential, writeCredential, type StoredCredential } from "../config/hosts.js";
import { createDebug } from "../http/debug.js";
import { OAuthError, refreshTokens, type OAuthTokens } from "./oauth-flow.js";
import type { AuthStrategy, GitCredentials } from "./types.js";

const debug = createDebug("auth");

/** Refresh a minute early, so a token cannot expire while a request is in flight. */
const SKEW_MS = 60_000;

/**
 * Reading and writing the stored credential, as an interface so tests do not need a
 * temp directory and the MCP server can point it at its own file.
 */
export type OAuthTokenStore = {
  read(): Promise<StoredCredential | undefined>;
  write(credential: StoredCredential): Promise<void>;
};

/** The default store: `~/.config/bb/hosts.yml`, via the shared 0600 atomic write. */
export const hostsTokenStore = (env?: NodeJS.ProcessEnv): OAuthTokenStore => ({
  read: () => readCredential(undefined, env),
  write: (credential) => writeCredential(credential, undefined, env),
});

export type OAuthAuthOptions = {
  clientId: string;
  clientSecret: string;
  store: OAuthTokenStore;
  fetchImpl?: typeof fetch | undefined;
  now?: (() => number) | undefined;
  source?: string | undefined;
};

export const toStored = (
  previous: StoredCredential | undefined,
  tokens: OAuthTokens,
  consumer: { clientId: string; clientSecret: string },
): StoredCredential => ({
  kind: "oauth",
  token: tokens.accessToken,
  expiresAt: new Date(tokens.expiresAt).toISOString(),
  clientId: consumer.clientId,
  // Carried forward on every refresh. Dropping it here would leave a credential that
  // works until the access token expires and then cannot renew itself.
  clientSecret: consumer.clientSecret,
  scopes: tokens.scopes,
  ...(tokens.refreshToken === undefined ? {} : { refreshToken: tokens.refreshToken }),
  ...(previous?.refreshToken === undefined || previous.refreshToken === tokens.refreshToken
    ? {}
    : { previousRefreshToken: previous.refreshToken }),
  // Identity is captured at login and does not change on refresh.
  ...(previous?.email === undefined ? {} : { email: previous.email }),
  ...(previous?.username === undefined ? {} : { username: previous.username }),
  ...(previous?.uuid === undefined ? {} : { uuid: previous.uuid }),
});

/**
 * An OAuth 2.0 credential, refreshed on demand.
 *
 * Two rules make this safe whether or not Bitbucket rotates refresh tokens — which
 * Atlassian does not document:
 *
 *  1. **Persist before use.** The new pair is written before the access token is handed
 *     to the caller. Handing it out first and then crashing would leave the on-disk
 *     refresh token already spent, forcing a browser login to recover.
 *  2. **Keep one generation.** A refresh that fails on the current token is retried once
 *     with `previousRefreshToken`, which recovers the crash-between-response-and-write
 *     window instead of dumping the user back into a browser.
 *
 * A single in-flight promise coordinates concurrent callers. Unlike a locally signed
 * JWT, a refresh is a network call that must not be issued twice: the second would
 * present a token the first may have just invalidated.
 */
export const createOAuthAuth = (options: OAuthAuthOptions): AuthStrategy => {
  const now = options.now ?? Date.now;
  let cached: { token: string; expiresAt: number } | undefined;
  let inFlight: Promise<string> | undefined;
  /**
   * Set by `invalidate()` to force the next load past the not-yet-expired check.
   *
   * Dropping the in-memory cache alone is not enough: the stored `expiresAt` would
   * still look valid, so the next call would read the very token the server just
   * rejected and send it again. A 401 on a token we believe is live means our belief
   * is wrong — revoked, or a clock that disagrees — and only a refresh settles it.
   */
  let forceRefresh = false;

  const refreshFrom = async (stored: StoredCredential): Promise<string> => {
    const candidates = [stored.refreshToken, stored.previousRefreshToken].filter(
      (value): value is string => typeof value === "string" && value !== "",
    );
    if (candidates.length === 0) {
      throw new OAuthError("The stored OAuth credential has no refresh token.", {
        hint: "Run `bb auth login --web` to sign in again.",
      });
    }

    let lastError: unknown;
    for (const [index, candidate] of candidates.entries()) {
      try {
        const tokens = await refreshTokens({
          clientId: options.clientId,
          clientSecret: options.clientSecret,
          refreshToken: candidate,
          ...(options.fetchImpl === undefined ? {} : { fetchImpl: options.fetchImpl }),
          now,
        });
        // Rule 1: on disk before it is used.
        await options.store.write(
          toStored(stored, tokens, {
            clientId: options.clientId,
            clientSecret: options.clientSecret,
          }),
        );
        cached = { token: tokens.accessToken, expiresAt: tokens.expiresAt };
        return tokens.accessToken;
      } catch (error) {
        lastError = error;
        if (index === 0 && candidates.length > 1) {
          debug("refresh failed on the current token, retrying with the previous generation");
        }
      }
    }
    throw lastError;
  };

  const load = async (): Promise<string> => {
    const stored = await options.store.read();
    if (stored === undefined || stored.kind !== "oauth") {
      throw new OAuthError("No stored OAuth credential.", {
        hint: "Run `bb auth login --web` to sign in.",
      });
    }
    if (stored.clientId !== undefined && stored.clientId !== options.clientId) {
      throw new OAuthError("The stored OAuth credential belongs to a different consumer.", {
        hint:
          `It was issued for client id ${stored.clientId}. Either restore that value or run ` +
          "`bb auth login --web` to sign in with the current one.",
      });
    }

    const expiresAt = stored.expiresAt === undefined ? 0 : Date.parse(stored.expiresAt);
    if (!forceRefresh && Number.isFinite(expiresAt) && expiresAt - SKEW_MS > now()) {
      cached = { token: stored.token, expiresAt };
      return stored.token;
    }
    forceRefresh = false;
    return refreshFrom(stored);
  };

  const getToken = async (): Promise<string> => {
    if (!forceRefresh && cached !== undefined && cached.expiresAt - SKEW_MS > now()) {
      return cached.token;
    }
    inFlight ??= load().finally(() => {
      inFlight = undefined;
    });
    return inFlight;
  };

  return {
    kind: "oauth",
    capabilities: {
      // A 3-legged OAuth token acts as the authorizing user, so identity works. Whether
      // a given call is *permitted* depends on the consumer's scopes, which is a
      // different axis and only knowable from the token response.
      hasUserIdentity: true,
      canManageDeployKeys: true,
      scope: { type: "user" },
    },
    authorize: async () => ({ authorization: `Bearer ${await getToken()}` }),
    /**
     * The first strategy in this codebase to return true.
     *
     * That makes the 401 retry in `HttpClient` live rather than dead code: an access
     * token that expired mid-flight is the one auth failure genuinely worth retrying,
     * and dropping the cache is all it takes for the next attempt to mint a new one.
     */
    invalidate: async () => {
      cached = undefined;
      forceRefresh = true;
      const stored = await options.store.read();
      return stored?.kind === "oauth" && stored.refreshToken !== undefined;
    },
    // Refreshes if needed rather than reporting nothing on a cold cache, which would
    // make git fall back to prompting for a password that does not exist.
    gitCredentials: async (): Promise<GitCredentials> => ({
      username: "x-token-auth",
      password: await getToken(),
    }),
    ...(options.source === undefined ? {} : { source: options.source }),
  };
};
