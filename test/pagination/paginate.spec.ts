import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { HttpClient } from "../../src/http/http-client.js";
import { collect } from "../../src/pagination/collect.js";
import { paginate, paginatePages } from "../../src/pagination/paginate.js";
import { fullEnvelope, minimalEnvelope } from "../helpers/page.js";
import { server } from "../msw-server.js";

const BASE = "https://api.bitbucket.org/2.0";
const client = (): HttpClient => new HttpClient();

describe("paginate", () => {
  it("follows a three-page chain in the list-based envelope", async () => {
    server.use(
      http.get(`${BASE}/items`, ({ request }) => {
        const page = new URL(request.url).searchParams.get("page");
        if (page === null) return HttpResponse.json(fullEnvelope([1, 2], `${BASE}/items?page=2`));
        if (page === "2") return HttpResponse.json(fullEnvelope([3, 4], `${BASE}/items?page=3`));
        return HttpResponse.json(fullEnvelope([5]));
      }),
    );
    expect(await collect(paginate<number>(client(), { path: "/items" }))).toEqual([1, 2, 3, 4, 5]);
  });

  it("follows the iterator-based envelope, which omits size, page and previous", async () => {
    server.use(
      http.get(`${BASE}/commits`, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("ctx");
        return cursor === null
          ? HttpResponse.json(minimalEnvelope(["a"], `${BASE}/commits?ctx=opaque-hash`))
          : HttpResponse.json(minimalEnvelope(["b"]));
      }),
    );
    const pages = await collect(paginatePages<string>(client(), { path: "/commits" }));
    expect(pages.map((p) => p.values)).toEqual([["a"], ["b"]]);
    // `size` must stay undefined rather than being synthesised — progress UI depends on
    // being able to tell "unknown total" from a real one.
    expect(pages[0]?.size).toBeUndefined();
  });

  it("follows `next` byte-for-byte, preserving its projection and cursor", async () => {
    const seen: string[] = [];
    const next = `${BASE}/items?fields=%2Bvalues.reviewers&ctx=abc123&pagelen=10`;
    server.use(
      http.get(`${BASE}/items`, ({ request }) => {
        seen.push(request.url);
        return new URL(request.url).searchParams.has("ctx")
          ? HttpResponse.json(fullEnvelope([2]))
          : HttpResponse.json(fullEnvelope([1], next));
      }),
    );
    await collect(paginate<number>(client(), { path: "/items" }));
    expect(seen[1]).toBe(next);
  });

  it("stops the HTTP chain as soon as `limit` is reached", async () => {
    const handler = vi.fn<() => Response>(() =>
      HttpResponse.json(fullEnvelope([1, 2, 3], `${BASE}/items?page=2`)),
    );
    server.use(http.get(`${BASE}/items`, handler));
    expect(await collect(paginate<number>(client(), { path: "/items" }, { limit: 2 }))).toEqual([
      1, 2,
    ]);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("shrinks the first pagelen when limit is smaller than a page", async () => {
    let pagelen: string | null = null;
    server.use(
      http.get(`${BASE}/items`, ({ request }) => {
        pagelen = new URL(request.url).searchParams.get("pagelen");
        return HttpResponse.json(fullEnvelope([1]));
      }),
    );
    await collect(paginate<number>(client(), { path: "/items" }, { limit: 3 }));
    // Clamped up to Bitbucket's minimum of 10 rather than sent as 3, which it rejects.
    expect(pagelen).toBe("10");
  });

  it("keeps going when a page is empty but still carries a next link", async () => {
    server.use(
      http.get(`${BASE}/items`, ({ request }) =>
        new URL(request.url).searchParams.has("page")
          ? HttpResponse.json(fullEnvelope([9]))
          : HttpResponse.json(fullEnvelope([], `${BASE}/items?page=2`)),
      ),
    );
    expect(await collect(paginate<number>(client(), { path: "/items" }))).toEqual([9]);
  });

  it("stops issuing requests when the consumer breaks early", async () => {
    const handler = vi.fn<() => Response>(() =>
      HttpResponse.json(fullEnvelope([1, 2], `${BASE}/items?page=2`)),
    );
    server.use(http.get(`${BASE}/items`, handler));
    for await (const value of paginate<number>(client(), { path: "/items" })) {
      if (value === 1) break;
    }
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("refuses to follow a next link pointing at another origin", async () => {
    server.use(
      http.get(`${BASE}/items`, () =>
        HttpResponse.json(fullEnvelope([1], "https://evil.example.com/items?page=2")),
      ),
    );
    await expect(collect(paginate<number>(client(), { path: "/items" }))).rejects.toThrow(
      /Refusing to follow a pagination link to https:\/\/evil\.example\.com/,
    );
  });

  it("guards against a self-referential next link", async () => {
    const handler = vi.fn<() => Response>(() =>
      HttpResponse.json(fullEnvelope([1], `${BASE}/items?page=1`)),
    );
    server.use(http.get(`${BASE}/items`, handler));
    await collect(paginate<number>(client(), { path: "/items" }, { maxPages: 4 }));
    expect(handler).toHaveBeenCalledTimes(4);
  });
});
