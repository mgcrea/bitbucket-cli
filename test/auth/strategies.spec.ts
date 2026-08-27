import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAccessTokenAuth } from "../../src/auth/access-token.js";
import { createApiTokenAuth } from "../../src/auth/api-token.js";
import { resolveAuthFromEnv } from "../../src/auth/resolve.js";
import { HttpClient } from "../../src/http/http-client.js";
import { server } from "../msw-server.js";

const BASE = "https://api.bitbucket.org/2.0";

describe("createApiTokenAuth", () => {
  it("sends Basic with the Atlassian email, and never puts it in the URL", async () => {
    let authorization: string | null = null;
    let url = "";
    server.use(
      http.get(`${BASE}/user`, ({ request }) => {
        authorization = request.headers.get("authorization");
        url = request.url;
        return HttpResponse.json({ uuid: "{u}" });
      }),
    );
    const auth = createApiTokenAuth({ token: "tok", email: "a@b.com" });
    await new HttpClient({ auth }).request({ path: "/user" });

    expect(authorization).toBe(`Basic ${Buffer.from("a@b.com:tok").toString("base64")}`);
    expect(url).not.toContain("a@b.com");
  });

  it("sends Bearer when no email is available", async () => {
    let authorization: string | null = null;
    server.use(
      http.get(`${BASE}/user`, ({ request }) => {
        authorization = request.headers.get("authorization");
        return HttpResponse.json({});
      }),
    );
    await new HttpClient({ auth: createApiTokenAuth({ token: "tok" }) }).request({ path: "/user" });
    expect(authorization).toBe("Bearer tok");
  });

  it("refuses Basic without an email rather than sending a broken header", () => {
    expect(() => createApiTokenAuth({ token: "tok", transport: "basic" })).toThrow(
      /needs the Atlassian account email/,
    );
  });

  it("captures the Bitbucket username, which git needs and the email cannot supply", async () => {
    // /user returns display_name, nickname AND username; only the last is usable in a
    // clone URL — the other two contain spaces.
    server.use(
      http.get(`${BASE}/user`, () =>
        HttpResponse.json({
          display_name: "Olivier Louvignes",
          nickname: "Olivier Louvignes",
          username: "olouvignes1",
          uuid: "{u}",
        }),
      ),
    );
    const { createBitbucketClient } = await import("../../src/client/bitbucket-client.js");
    const user = await createBitbucketClient({
      auth: createApiTokenAuth({ token: "t", email: "a@b.com" }),
    }).users.current();
    expect(user.username).toBe("olouvignes1");
    expect(user.displayName).toBe("Olivier Louvignes");
  });

  it("hands git the static token username, not the REST email", () => {
    // REST authenticates as the email; git over HTTPS does not accept it. Conflating
    // the two produces a 403 on push that looks nothing like an auth-setup mistake.
    expect(createApiTokenAuth({ token: "tok", email: "a@b.com" }).gitCredentials()).toEqual({
      username: "x-bitbucket-api-token-auth",
      password: "tok",
    });
  });
});

describe("createAccessTokenAuth", () => {
  it("sends Bearer and reports that it has no user identity", () => {
    const auth = createAccessTokenAuth({ token: "rt" });
    expect(auth.capabilities.hasUserIdentity).toBe(false);
    expect(auth.capabilities.canManageDeployKeys).toBe(false);
  });

  it("uses x-token-auth for git", () => {
    expect(createAccessTokenAuth({ token: "rt" }).gitCredentials()).toEqual({
      username: "x-token-auth",
      password: "rt",
    });
  });
});

describe("resolveAuthFromEnv", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("BB_") || key.startsWith("BITBUCKET_")) delete process.env[key];
    }
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it("falls back to anonymous when nothing is set", () => {
    expect(resolveAuthFromEnv().kind).toBe("anonymous");
  });

  it("declares the credential type from the variable it arrived in", () => {
    process.env["BB_ACCESS_TOKEN"] = "rt";
    const auth = resolveAuthFromEnv();
    expect(auth.kind).toBe("access-token");
    expect(auth.source).toBe("BB_ACCESS_TOKEN");
  });

  it("prefers an access token over a plain token when both are set", () => {
    process.env["BB_ACCESS_TOKEN"] = "rt";
    process.env["BB_TOKEN"] = "at";
    expect(resolveAuthFromEnv().kind).toBe("access-token");
  });

  it("pairs BB_EMAIL with BB_TOKEN as an api-token using Basic", async () => {
    process.env["BB_TOKEN"] = "tok";
    process.env["BB_EMAIL"] = "a@b.com";
    let authorization: string | null = null;
    server.use(
      http.get(`${BASE}/user`, ({ request }) => {
        authorization = request.headers.get("authorization");
        return HttpResponse.json({});
      }),
    );
    await new HttpClient({ auth: resolveAuthFromEnv() }).request({ path: "/user" });
    expect(authorization).toBe(`Basic ${Buffer.from("a@b.com:tok").toString("base64")}`);
  });

  it("honours an explicit BB_TOKEN_TYPE override", () => {
    process.env["BB_TOKEN"] = "rt";
    process.env["BB_TOKEN_TYPE"] = "access-token";
    expect(resolveAuthFromEnv().kind).toBe("access-token");
  });

  it("accepts the BITBUCKET_ alias and reports which variable won", () => {
    process.env["BITBUCKET_TOKEN"] = "tok";
    expect(resolveAuthFromEnv().source).toBe("BITBUCKET_TOKEN");
  });
});

describe("401 handling", () => {
  it("gives the strategy one chance to refresh before surfacing the failure", async () => {
    const invalidate = vi.fn<() => Promise<boolean>>().mockResolvedValueOnce(true);
    const handler = vi
      .fn<() => Response>()
      .mockImplementationOnce(() => new HttpResponse(null, { status: 401 }))
      .mockImplementationOnce(() => HttpResponse.json({ ok: true }));
    server.use(http.get(`${BASE}/user`, handler));

    const auth = { ...createApiTokenAuth({ token: "t" }), invalidate };
    expect(await new HttpClient({ auth }).request({ path: "/user" })).toEqual({ ok: true });
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
