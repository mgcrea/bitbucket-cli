import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import {
  authorizeUrl,
  createState,
  exchangeCode,
  OAuthError,
  refreshTokens,
  statesMatch,
  TOKEN_URL,
} from "../../src/auth/oauth-flow.js";
import { createOAuthAuth, type OAuthTokenStore } from "../../src/auth/oauth.js";
import type { StoredCredential } from "../../src/config/hosts.js";
import { HttpClient } from "../../src/http/http-client.js";
import { server } from "../msw-server.js";

const CONSUMER = { clientId: "key", clientSecret: "secret" };
const BASE = "https://api.bitbucket.org/2.0";

/** An in-memory store, so none of this touches a real hosts.yml. */
const memoryStore = (
  initial?: StoredCredential,
): OAuthTokenStore & { current: () => StoredCredential | undefined; writes: () => number } => {
  let credential = initial;
  let writes = 0;
  return {
    read: () => Promise.resolve(credential),
    write: (next) => {
      credential = next;
      writes += 1;
      return Promise.resolve();
    },
    current: () => credential,
    writes: () => writes,
  };
};

const stored = (over: Partial<StoredCredential> = {}): StoredCredential => ({
  kind: "oauth",
  token: "at-stored",
  refreshToken: "rt-stored",
  clientId: "key",
  clientSecret: "secret",
  expiresAt: new Date(10_000_000).toISOString(),
  ...over,
});

const tokenResponse = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  access_token: "at-1",
  refresh_token: "rt-1",
  expires_in: 7200,
  scopes: "account repository pullrequest",
  token_type: "bearer",
  ...over,
});

describe("authorizeUrl", () => {
  it("builds the authorize URL on bitbucket.org, not the API host", () => {
    const url = new URL(authorizeUrl({ clientId: "key", state: "st" }));
    expect(url.origin).toBe("https://bitbucket.org");
    expect(url.pathname).toBe("/site/oauth2/authorize");
    expect(url.searchParams.get("client_id")).toBe("key");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("st");
  });

  it("sends no scope parameter, because Bitbucket ignores one on a grant", () => {
    // Scopes are fixed on the consumer. Sending one would imply a choice the caller
    // does not have, and the granted set has to be read off the token response.
    const url = new URL(authorizeUrl({ clientId: "key", state: "st" }));
    expect(url.searchParams.has("scope")).toBe(false);
  });

  it("sends no code_challenge, because Bitbucket Cloud does not support PKCE", () => {
    const url = new URL(authorizeUrl({ clientId: "key", state: "st" }));
    expect(url.searchParams.has("code_challenge")).toBe(false);
    expect(url.searchParams.has("code_challenge_method")).toBe(false);
  });

  it("omits redirect_uri unless one is given, so both legs agree by default", () => {
    expect(
      new URL(authorizeUrl({ clientId: "k", state: "s" })).searchParams.has("redirect_uri"),
    ).toBe(false);
    expect(
      new URL(
        authorizeUrl({ clientId: "k", state: "s", redirectUri: "http://localhost:8724/callback" }),
      ).searchParams.get("redirect_uri"),
    ).toBe("http://localhost:8724/callback");
  });
});

describe("state", () => {
  it("compares equal values and rejects different ones", () => {
    const state = createState();
    expect(statesMatch(state, state)).toBe(true);
    expect(statesMatch(state, createState())).toBe(false);
  });

  it("does not throw on a length mismatch, which timingSafeEqual would", () => {
    expect(statesMatch("short", "a-much-longer-value")).toBe(false);
  });
});

describe("exchangeCode", () => {
  it("posts the code with Basic client credentials, keeping the secret out of the body", async () => {
    let authorization: string | null = null;
    let body = "";
    server.use(
      http.post(TOKEN_URL, async ({ request }) => {
        authorization = request.headers.get("authorization");
        body = await request.text();
        return HttpResponse.json(tokenResponse());
      }),
    );

    const tokens = await exchangeCode({ ...CONSUMER, code: "abc", now: () => 1_000 });

    expect(authorization).toBe(`Basic ${Buffer.from("key:secret").toString("base64")}`);
    expect(body).toContain("grant_type=authorization_code");
    expect(body).toContain("code=abc");
    expect(body).not.toContain("secret");
    expect(tokens.accessToken).toBe("at-1");
    expect(tokens.refreshToken).toBe("rt-1");
    expect(tokens.expiresAt).toBe(1_000 + 7200 * 1000);
  });

  it("parses Bitbucket's plural `scopes` key, which is not what RFC 6749 says", async () => {
    server.use(http.post(TOKEN_URL, () => HttpResponse.json(tokenResponse())));
    const tokens = await exchangeCode({ ...CONSUMER, code: "abc" });
    expect(tokens.scopes).toEqual(["account", "repository", "pullrequest"]);
  });

  it("also accepts the standard singular `scope` key", async () => {
    server.use(
      http.post(TOKEN_URL, () =>
        HttpResponse.json(tokenResponse({ scopes: undefined, scope: "repository" })),
      ),
    );
    expect((await exchangeCode({ ...CONSUMER, code: "abc" })).scopes).toEqual(["repository"]);
  });

  it("derives the expiry from expires_in rather than a hard-coded lifetime", async () => {
    // Atlassian documents one hour on one page and two hours on another, so only the
    // response can be trusted.
    server.use(http.post(TOKEN_URL, () => HttpResponse.json(tokenResponse({ expires_in: 60 }))));
    const tokens = await exchangeCode({ ...CONSUMER, code: "abc", now: () => 0 });
    expect(tokens.expiresAt).toBe(60_000);
  });

  it("falls back to a finite expiry when expires_in is absent, never NaN", async () => {
    server.use(
      http.post(TOKEN_URL, () => HttpResponse.json(tokenResponse({ expires_in: undefined }))),
    );
    const tokens = await exchangeCode({ ...CONSUMER, code: "abc", now: () => 0 });
    expect(Number.isFinite(tokens.expiresAt)).toBe(true);
    expect(tokens.expiresAt).toBeGreaterThan(0);
  });

  it("turns an OAuth error response into a hint that names the fix", async () => {
    server.use(
      http.post(TOKEN_URL, () =>
        HttpResponse.json(
          { error: "invalid_client", error_description: "Client credentials are invalid" },
          { status: 400 },
        ),
      ),
    );
    await expect(exchangeCode({ ...CONSUMER, code: "abc" })).rejects.toThrow(
      /invalid_client.*Client credentials are invalid/,
    );
    await expect(exchangeCode({ ...CONSUMER, code: "abc" })).rejects.toMatchObject({
      code: "invalid_client",
      hint: expect.stringContaining("OAuth consumers"),
    });
  });

  it("reports a non-JSON body as such, since that means the wrong host was hit", async () => {
    server.use(http.post(TOKEN_URL, () => new HttpResponse("<html>login</html>", { status: 200 })));
    await expect(exchangeCode({ ...CONSUMER, code: "abc" })).rejects.toThrow(/non-JSON body/);
  });
});

describe("refreshTokens", () => {
  it("carries the old refresh token forward when the response omits one", async () => {
    // Atlassian does not document whether refresh tokens rotate. An absent
    // `refresh_token` means "keep using yours", and losing it would force a re-login.
    server.use(
      http.post(TOKEN_URL, () =>
        HttpResponse.json(tokenResponse({ refresh_token: undefined, access_token: "at-2" })),
      ),
    );
    const tokens = await refreshTokens({ ...CONSUMER, refreshToken: "rt-old" });
    expect(tokens.accessToken).toBe("at-2");
    expect(tokens.refreshToken).toBe("rt-old");
  });

  it("takes the rotated refresh token when one comes back", async () => {
    server.use(
      http.post(TOKEN_URL, () => HttpResponse.json(tokenResponse({ refresh_token: "rt-2" }))),
    );
    expect((await refreshTokens({ ...CONSUMER, refreshToken: "rt-1" })).refreshToken).toBe("rt-2");
  });
});

describe("createOAuthAuth", () => {
  it("uses the stored access token while it is still valid", async () => {
    const store = memoryStore(stored());
    const auth = createOAuthAuth({ ...CONSUMER, store, now: () => 1_000_000 });
    expect(await auth.authorize({ method: "GET", url: "" })).toEqual({
      authorization: "Bearer at-stored",
    });
    expect(store.writes()).toBe(0);
  });

  it("refreshes a minute before expiry, so a token cannot die mid-request", async () => {
    server.use(
      http.post(TOKEN_URL, () => HttpResponse.json(tokenResponse({ access_token: "at-fresh" }))),
    );
    const store = memoryStore(stored());
    // 30s before the stored expiry: still valid, but inside the skew.
    const auth = createOAuthAuth({ ...CONSUMER, store, now: () => 10_000_000 - 30_000 });
    expect(await auth.authorize({ method: "GET", url: "" })).toEqual({
      authorization: "Bearer at-fresh",
    });
  });

  it("persists the new pair before handing out the access token", async () => {
    // Rule 1. Handing it out first and then crashing leaves the stored refresh token
    // possibly already spent, with a browser login as the only recovery.
    const writeOrder: string[] = [];
    server.use(
      http.post(TOKEN_URL, () => HttpResponse.json(tokenResponse({ access_token: "at-fresh" }))),
    );
    const store: OAuthTokenStore = {
      read: () => Promise.resolve(stored({ expiresAt: new Date(0).toISOString() })),
      write: () => {
        writeOrder.push("write");
        return Promise.resolve();
      },
    };
    const auth = createOAuthAuth({ ...CONSUMER, store, now: () => 1_000_000 });
    await auth.authorize({ method: "GET", url: "" });
    writeOrder.push("authorize-returned");
    expect(writeOrder).toEqual(["write", "authorize-returned"]);
  });

  it("keeps the previous generation so a lost write is recoverable", async () => {
    server.use(
      http.post(TOKEN_URL, () => HttpResponse.json(tokenResponse({ refresh_token: "rt-new" }))),
    );
    const store = memoryStore(stored({ expiresAt: new Date(0).toISOString() }));
    const auth = createOAuthAuth({ ...CONSUMER, store, now: () => 1_000_000 });
    await auth.authorize({ method: "GET", url: "" });
    expect(store.current()).toMatchObject({
      refreshToken: "rt-new",
      previousRefreshToken: "rt-stored",
    });
  });

  it("retries a failed refresh with the previous generation", async () => {
    // Rule 2: recovers exactly the crash-between-response-and-write window rather
    // than dumping the user back into a browser.
    const attempts: string[] = [];
    server.use(
      http.post(TOKEN_URL, async ({ request }) => {
        const body = new URLSearchParams(await request.text());
        const token = body.get("refresh_token") ?? "";
        attempts.push(token);
        return token === "rt-previous"
          ? HttpResponse.json(tokenResponse({ access_token: "at-recovered" }))
          : HttpResponse.json({ error: "invalid_grant" }, { status: 400 });
      }),
    );
    const store = memoryStore(
      stored({
        refreshToken: "rt-dead",
        previousRefreshToken: "rt-previous",
        expiresAt: new Date(0).toISOString(),
      }),
    );
    const auth = createOAuthAuth({ ...CONSUMER, store, now: () => 1_000_000 });
    expect(await auth.authorize({ method: "GET", url: "" })).toEqual({
      authorization: "Bearer at-recovered",
    });
    expect(attempts).toEqual(["rt-dead", "rt-previous"]);
  });

  it("carries the consumer secret through a refresh, so it can refresh again", async () => {
    server.use(http.post(TOKEN_URL, () => HttpResponse.json(tokenResponse())));
    const store = memoryStore(stored({ expiresAt: new Date(0).toISOString() }));
    const auth = createOAuthAuth({ ...CONSUMER, store, now: () => 1_000_000 });
    await auth.authorize({ method: "GET", url: "" });
    expect(store.current()).toMatchObject({ clientId: "key", clientSecret: "secret" });
  });

  it("issues only one refresh for concurrent callers", async () => {
    // A refresh is a network call, not a local signature: a second one would present a
    // token the first may have just invalidated.
    const handler = vi.fn<() => Response>(() => HttpResponse.json(tokenResponse()));
    server.use(http.post(TOKEN_URL, handler));
    const store = memoryStore(stored({ expiresAt: new Date(0).toISOString() }));
    const auth = createOAuthAuth({ ...CONSUMER, store, now: () => 1_000_000 });
    await Promise.all([
      auth.authorize({ method: "GET", url: "" }),
      auth.authorize({ method: "GET", url: "" }),
      auth.authorize({ method: "GET", url: "" }),
    ]);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("refuses a credential issued to a different consumer", async () => {
    const store = memoryStore(stored({ clientId: "other-key" }));
    const auth = createOAuthAuth({ ...CONSUMER, store, now: () => 1_000_000 });
    await expect(auth.authorize({ method: "GET", url: "" })).rejects.toThrow(
      /belongs to a different consumer/,
    );
  });

  it("explains itself when nothing is stored, rather than sending an empty Bearer", async () => {
    const auth = createOAuthAuth({ ...CONSUMER, store: memoryStore() });
    await expect(auth.authorize({ method: "GET", url: "" })).rejects.toBeInstanceOf(OAuthError);
    // The remedy lives on `hint`, which is where `describeError` looks for it.
    await expect(auth.authorize({ method: "GET", url: "" })).rejects.toMatchObject({
      hint: expect.stringContaining("auth login --web"),
    });
  });

  it("reports a retry as worthwhile on a 401, unlike every other strategy", async () => {
    // This is what makes HttpClient's 401 retry live code: both token strategies
    // return false, so before OAuth that branch could never fire.
    const auth = createOAuthAuth({ ...CONSUMER, store: memoryStore(stored()) });
    expect(await auth.invalidate()).toBe(true);
  });

  it("does not claim a retry is worthwhile with no refresh token to use", async () => {
    const store = memoryStore(stored({ refreshToken: undefined }));
    expect(await createOAuthAuth({ ...CONSUMER, store }).invalidate()).toBe(false);
  });

  it("drives the 401 retry end to end, reminting the token once", async () => {
    server.use(
      http.post(TOKEN_URL, () => HttpResponse.json(tokenResponse({ access_token: "at-2" }))),
    );
    const seen: (string | null)[] = [];
    server.use(
      http.get(`${BASE}/user`, ({ request }) => {
        seen.push(request.headers.get("authorization"));
        return seen.length === 1
          ? new HttpResponse(null, { status: 401 })
          : HttpResponse.json({ uuid: "{u}" });
      }),
    );
    const store = memoryStore(stored());
    const auth = createOAuthAuth({ ...CONSUMER, store, now: () => 1_000_000 });

    expect(await new HttpClient({ auth }).request({ path: "/user" })).toEqual({ uuid: "{u}" });
    expect(seen).toEqual(["Bearer at-stored", "Bearer at-2"]);
  });

  it("hands git a token, refreshing first if the cache is cold", async () => {
    server.use(
      http.post(TOKEN_URL, () => HttpResponse.json(tokenResponse({ access_token: "at-git" }))),
    );
    const store = memoryStore(stored({ expiresAt: new Date(0).toISOString() }));
    const auth = createOAuthAuth({ ...CONSUMER, store, now: () => 1_000_000 });
    expect(await auth.gitCredentials()).toEqual({ username: "x-token-auth", password: "at-git" });
  });
});
