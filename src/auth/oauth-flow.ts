import { randomBytes, timingSafeEqual } from "node:crypto";

import { BitbucketError, type BitbucketErrorKind } from "../http/errors.js";

/**
 * Bitbucket Cloud's OAuth 2.0 endpoints live on `bitbucket.org`, NOT on
 * `api.bitbucket.org` where every other call in this codebase goes. Getting this wrong
 * returns an HTML login page rather than a JSON error, so it fails at the parse step
 * with a message that says nothing about the cause.
 */
export const AUTHORIZE_URL = "https://bitbucket.org/site/oauth2/authorize";
export const TOKEN_URL = "https://bitbucket.org/site/oauth2/access_token";

/**
 * A fixed loopback port rather than an ephemeral one.
 *
 * Bitbucket matches the callback by *prefix* — a supplied `redirect_uri` must be
 * appended to the URL configured on the consumer — which is more forgiving than the
 * byte-for-byte match most providers do. But the consumer still has to name a concrete
 * URL, so the port cannot be chosen at runtime: a random one is never a prefix of what
 * was registered.
 */
export const DEFAULT_REDIRECT_URI = "http://localhost:8724/callback";

/** How long to wait for the browser round trip before giving the port back. */
export const CALLBACK_TIMEOUT_MS = 120_000;

/**
 * An OAuth grant failure.
 *
 * Deliberately reuses the existing `auth` kind rather than widening
 * `BitbucketErrorKind`: a rejected grant *is* an authentication failure, so it should
 * land on the same exit code and render through `describeError` unchanged.
 */
export class OAuthError extends BitbucketError {
  override readonly name = "OAuthError";
  readonly kind: BitbucketErrorKind = "auth";

  constructor(
    message: string,
    options?: { code?: string | undefined; hint?: string | undefined; cause?: unknown },
  ) {
    super(message, options);
    this.code = options?.code;
  }

  /** The `error` field of the OAuth error response, e.g. `invalid_grant`. */
  readonly code: string | undefined;
}

export type OAuthTokens = {
  accessToken: string;
  refreshToken: string | undefined;
  /** Absolute expiry as epoch milliseconds, derived from `expires_in`. */
  expiresAt: number;
  /** The scopes Bitbucket actually granted, which the caller cannot choose. */
  scopes: readonly string[];
};

/** 32 random bytes, base64url-encoded. Compared with `statesMatch`, never with `===`. */
export const createState = (random: (size: number) => Buffer = randomBytes): string =>
  random(32).toString("base64url");

/** Constant-time compare, so a mismatched state cannot be probed byte by byte. */
export const statesMatch = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

export type AuthorizeUrlOptions = {
  clientId: string;
  state: string;
  redirectUri?: string | undefined;
};

/**
 * The URL to open in the browser.
 *
 * There is no `scope` parameter, and that is not an omission: Bitbucket Cloud does not
 * honour one on a grant request. Scopes are fixed on the OAuth consumer when it is
 * created, so a caller cannot ask for less than it was configured with — which is why
 * the granted set has to be read back off the token response instead.
 *
 * There is no `code_challenge` either. Bitbucket Cloud does not support PKCE, so this
 * is a confidential-client flow and the client secret is load-bearing.
 */
export const authorizeUrl = (options: AuthorizeUrlOptions): string => {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", options.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", options.state);
  if (options.redirectUri !== undefined) {
    url.searchParams.set("redirect_uri", options.redirectUri);
  }
  return url.toString();
};

type TokenResponseBody = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  /** Bitbucket sends `scopes` (plural, space-separated); RFC 6749 says `scope`. */
  scopes?: unknown;
  scope?: unknown;
  error?: unknown;
  error_description?: unknown;
};

const parseScopes = (body: TokenResponseBody): readonly string[] => {
  const raw = typeof body.scopes === "string" ? body.scopes : body.scope;
  return typeof raw === "string" ? raw.split(/[\s,]+/).filter((s) => s !== "") : [];
};

/**
 * Atlassian's own documentation gives two different access-token lifetimes on two
 * different pages (one hour and two hours), so a hard-coded constant would be wrong
 * half the time. `expires_in` from the response is the only trustworthy source; this
 * fallback exists solely so a malformed response cannot produce a NaN expiry that
 * makes every subsequent request look already-expired.
 */
const FALLBACK_LIFETIME_SECONDS = 3600;

const toTokens = (body: TokenResponseBody, now: number): OAuthTokens => {
  if (typeof body.access_token !== "string" || body.access_token === "") {
    throw new OAuthError("Bitbucket's token response contained no access_token.", {
      hint: "This usually means the request reached an HTML page rather than the token endpoint.",
    });
  }
  const lifetime =
    typeof body.expires_in === "number" && Number.isFinite(body.expires_in) && body.expires_in > 0
      ? body.expires_in
      : FALLBACK_LIFETIME_SECONDS;
  return {
    accessToken: body.access_token,
    refreshToken:
      typeof body.refresh_token === "string" && body.refresh_token !== ""
        ? body.refresh_token
        : undefined,
    expiresAt: now + lifetime * 1000,
    scopes: parseScopes(body),
  };
};

const HINTS: Record<string, string> = {
  invalid_client:
    "The client id or secret is wrong. Check the OAuth consumer under Workspace settings → " +
    "Apps and features → OAuth consumers.",
  invalid_grant:
    "The code or refresh token was rejected — it may be expired, already used, or issued to a " +
    "different consumer. Run `bb auth login --web` again.",
  unauthorized_client:
    "This consumer is not permitted to use the authorization code grant. Check that it has a " +
    "callback URL configured — a consumer without one cannot do a 3-legged flow.",
  invalid_request:
    "Bitbucket rejected the shape of the request. If a redirect_uri was sent, it must begin with " +
    "the callback URL configured on the consumer.",
};

/**
 * POST to the token endpoint. Shared by the code exchange and the refresh, because the
 * only difference between them is the grant body.
 *
 * Client credentials go in an `Authorization: Basic` header rather than the form body.
 * Both are accepted, but the header keeps the secret out of anything that logs a body,
 * and RFC 6749 §2.3.1 prefers it.
 */
const postGrant = async (
  body: URLSearchParams,
  options: {
    clientId: string;
    clientSecret: string;
    fetchImpl?: typeof fetch | undefined;
    now?: (() => number) | undefined;
  },
): Promise<OAuthTokens> => {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const basic = Buffer.from(`${options.clientId}:${options.clientSecret}`).toString("base64");

  let response: Response;
  try {
    response = await fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Basic ${basic}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
  } catch (cause) {
    throw new OAuthError(`Could not reach ${TOKEN_URL}`, { cause });
  }

  const text = await response.text();
  let parsed: TokenResponseBody;
  try {
    parsed = (JSON.parse(text) as TokenResponseBody | null) ?? {};
  } catch (cause) {
    throw new OAuthError(
      `Bitbucket's token endpoint returned HTTP ${response.status} with a non-JSON body.`,
      { cause },
    );
  }

  if (!response.ok || typeof parsed.error === "string") {
    const code = typeof parsed.error === "string" ? parsed.error : undefined;
    const description =
      typeof parsed.error_description === "string" ? parsed.error_description : undefined;
    throw new OAuthError(
      `Bitbucket rejected the OAuth grant: ${code ?? `HTTP ${response.status}`}` +
        (description === undefined ? "" : ` — ${description}`),
      code === undefined ? {} : { code, hint: HINTS[code] },
    );
  }

  return toTokens(parsed, now());
};

export type ExchangeCodeOptions = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri?: string | undefined;
  fetchImpl?: typeof fetch | undefined;
  now?: (() => number) | undefined;
};

/** Trade an authorization code for tokens. The code is single-use. */
export const exchangeCode = async (options: ExchangeCodeOptions): Promise<OAuthTokens> => {
  const body = new URLSearchParams({ grant_type: "authorization_code", code: options.code });
  // Sent only when the caller used one on the authorize leg: Bitbucket requires the two
  // legs to agree, and omitting it on both is the simplest way to make them agree.
  if (options.redirectUri !== undefined) {
    body.set("redirect_uri", options.redirectUri);
  }
  return postGrant(body, options);
};

export type RefreshOptions = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  fetchImpl?: typeof fetch | undefined;
  now?: (() => number) | undefined;
};

/**
 * Mint a fresh access token.
 *
 * Atlassian does not document whether the refresh token rotates. The response carries
 * one either way, so callers must treat whatever comes back as authoritative rather
 * than assuming the old one still works.
 */
export const refreshTokens = async (options: RefreshOptions): Promise<OAuthTokens> => {
  const tokens = await postGrant(
    new URLSearchParams({ grant_type: "refresh_token", refresh_token: options.refreshToken }),
    options,
  );
  // A refresh response that omits `refresh_token` means "keep using the one you have",
  // which is only distinguishable from "it rotated" by looking. Carry the old one
  // forward so the caller never loses its ability to refresh again.
  return tokens.refreshToken === undefined
    ? { ...tokens, refreshToken: options.refreshToken }
    : tokens;
};
