import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import {
  AuthenticationError,
  GoneError,
  RateLimitError,
  ServerError,
  ValidationError,
} from "../../src/http/errors.js";
import { HttpClient } from "../../src/http/http-client.js";
import { computeDelay, DEFAULT_RETRY, parseRetryAfter } from "../../src/http/retry.js";
import { server } from "../msw-server.js";

const BASE = "https://api.bitbucket.org/2.0";
const fast = (): HttpClient => new HttpClient({ retry: { baseDelayMs: 1, maxDelayMs: 2 } });

describe("parseRetryAfter", () => {
  it("parses delta-seconds", () => {
    expect(parseRetryAfter("2")).toBe(2000);
  });

  it("parses the HTTP-date form", () => {
    const now = Date.parse("2026-08-27T12:00:00Z");
    expect(parseRetryAfter("Thu, 27 Aug 2026 12:00:30 GMT", now)).toBe(30_000);
  });

  it("returns undefined for a missing or unparseable value", () => {
    expect(parseRetryAfter(null)).toBeUndefined();
    expect(parseRetryAfter("soon")).toBeUndefined();
  });
});

describe("computeDelay", () => {
  it("prefers Retry-After over backoff", () => {
    expect(computeDelay(0, DEFAULT_RETRY, 5000)).toBe(5000);
  });

  it("uses full jitter bounded by base * 2^attempt", () => {
    expect(computeDelay(2, DEFAULT_RETRY, undefined, () => 0)).toBe(0);
    expect(computeDelay(2, DEFAULT_RETRY, undefined, () => 0.999)).toBeLessThanOrEqual(2000);
  });

  it("caps the ceiling at maxDelayMs", () => {
    expect(computeDelay(20, DEFAULT_RETRY, undefined, () => 0.999)).toBeLessThanOrEqual(20_000);
  });
});

describe("retry behaviour", () => {
  it("retries a 429 and succeeds on the next attempt", async () => {
    const handler = vi
      .fn<() => Response>()
      .mockImplementationOnce(
        () => new HttpResponse(null, { status: 429, headers: { "retry-after": "0" } }),
      )
      .mockImplementationOnce(() => HttpResponse.json({ ok: true }));
    server.use(http.get(`${BASE}/thing`, handler));
    expect(await fast().request({ path: "/thing" })).toEqual({ ok: true });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("retries a 429 even on a non-idempotent POST, because it was never processed", async () => {
    const handler = vi
      .fn<() => Response>()
      .mockImplementationOnce(() => new HttpResponse(null, { status: 429 }))
      .mockImplementationOnce(() => HttpResponse.json({ ok: true }));
    server.use(http.post(`${BASE}/thing`, handler));
    await fast().request({ method: "POST", path: "/thing", body: {} });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry a 503 on a POST that was not declared idempotent", async () => {
    const handler = vi.fn<() => Response>(() => new HttpResponse(null, { status: 503 }));
    server.use(http.post(`${BASE}/thing`, handler));
    await expect(fast().request({ method: "POST", path: "/thing", body: {} })).rejects.toThrow(
      ServerError,
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("retries a 503 on a POST that opts in via `idempotent`", async () => {
    const handler = vi.fn<() => Response>(() => new HttpResponse(null, { status: 503 }));
    server.use(http.post(`${BASE}/thing`, handler));
    await expect(
      fast().request({ method: "POST", path: "/thing", body: {}, idempotent: true }),
    ).rejects.toThrow(ServerError);
    expect(handler).toHaveBeenCalledTimes(DEFAULT_RETRY.maxAttempts);
  });

  it("fails fast instead of sleeping past maxRetryAfterMs", async () => {
    const handler = vi.fn<() => Response>(
      () => new HttpResponse(null, { status: 429, headers: { "retry-after": "3600" } }),
    );
    server.use(http.get(`${BASE}/thing`, handler));
    const error = await fast()
      .request({ path: "/thing" })
      .catch((e: unknown) => e);
    // Blocking a CLI for an hour is worse than failing with a clear message.
    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).retryAfterMs).toBe(3_600_000);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe("error mapping", () => {
  it("maps 400 to ValidationError and surfaces per-field messages", async () => {
    server.use(
      http.post(`${BASE}/pullrequests`, () =>
        HttpResponse.json(
          {
            type: "error",
            error: {
              message: "Bad request",
              fields: { "destination.branch.name": ["This branch does not exist"] },
            },
          },
          { status: 400 },
        ),
      ),
    );
    const error = await fast()
      .request({ method: "POST", path: "/pullrequests", body: {} })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).fields).toEqual({
      "destination.branch.name": ["This branch does not exist"],
    });
  });

  it("maps 410 on the issues endpoint to a GoneError explaining the removal", async () => {
    server.use(
      http.get(`${BASE}/repositories/acme/api/issues`, () =>
        HttpResponse.json({ type: "error", error: { message: "Gone" } }, { status: 410 }),
      ),
    );
    const error = await fast()
      .request({ path: "/repositories/acme/api/issues" })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GoneError);
    expect((error as GoneError).hint).toMatch(/removed the issue tracker API/);
  });

  it("tolerates an HTML error page instead of the JSON envelope", async () => {
    server.use(
      http.get(`${BASE}/thing`, () =>
        HttpResponse.text("<html>502 Bad Gateway</html>", { status: 502 }),
      ),
    );
    await expect(fast().request({ path: "/thing" })).rejects.toThrow(ServerError);
  });

  it("maps 401 to AuthenticationError", async () => {
    server.use(http.get(`${BASE}/user`, () => new HttpResponse(null, { status: 401 })));
    await expect(fast().request({ path: "/user" })).rejects.toThrow(AuthenticationError);
  });
});
