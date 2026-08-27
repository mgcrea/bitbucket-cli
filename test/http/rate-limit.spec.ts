import { describe, expect, it } from "vitest";

import { parseRateLimit } from "../../src/http/rate-limit.js";

const headers = (init: Record<string, string>): Headers => new Headers(init);

describe("parseRateLimit", () => {
  it("parses the RateLimit-policy quota and window", () => {
    const snapshot = parseRateLimit(headers({ "x-ratelimit-limit": "60, 60;w=3600" }));
    expect(snapshot?.limit).toBe(60);
    expect(snapshot?.window).toBe(3600);
  });

  it("parses a bare quota with no policy segment", () => {
    expect(parseRateLimit(headers({ "x-ratelimit-limit": "1000" }))?.limit).toBe(1000);
  });

  it("reads the undocumented remaining header", () => {
    expect(parseRateLimit(headers({ "x-ratelimit-remaining": "59" }))?.remaining).toBe(59);
  });

  it("treats a small reset value as seconds remaining", () => {
    const before = Date.now();
    const snapshot = parseRateLimit(headers({ "x-ratelimit-reset": "714" }));
    expect(snapshot?.resetAt?.getTime()).toBeGreaterThanOrEqual(before + 714_000);
  });

  it("treats a large reset value as absolute epoch seconds", () => {
    const epoch = 1_800_000_000;
    expect(parseRateLimit(headers({ "x-ratelimit-reset": String(epoch) }))?.resetAt).toEqual(
      new Date(epoch * 1000),
    );
  });

  it("flags nearLimit", () => {
    expect(parseRateLimit(headers({ "x-ratelimit-nearlimit": "true" }))?.nearLimit).toBe(true);
  });

  it("returns undefined when no rate-limit headers are present at all", () => {
    // Atlassian documents these as not necessarily sent on every response, so absence
    // must be distinguishable from a zero quota.
    expect(parseRateLimit(headers({ "content-type": "application/json" }))).toBeUndefined();
  });

  it("survives a garbage value without throwing", () => {
    expect(parseRateLimit(headers({ "x-ratelimit-limit": "unlimited" }))).toBeUndefined();
  });
});
