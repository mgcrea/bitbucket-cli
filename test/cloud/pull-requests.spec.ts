import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { createAccessTokenAuth } from "../../src/auth/access-token.js";
import { createApiTokenAuth } from "../../src/auth/api-token.js";
import { createBitbucketClient } from "../../src/client/bitbucket-client.js";
import { CapabilityError } from "../../src/http/errors.js";
import { collect } from "../../src/pagination/collect.js";
import { fullEnvelope } from "../helpers/page.js";
import { server } from "../msw-server.js";

const BASE = "https://api.bitbucket.org/2.0";
const PRS = `${BASE}/repositories/acme/api/pullrequests`;
const client = () => createBitbucketClient({ auth: createApiTokenAuth({ token: "t" }) });

const rawPr = (id: number, overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  title: `PR ${id}`,
  state: "OPEN",
  created_on: "2026-08-01T10:00:00Z",
  updated_on: "2026-08-02T10:00:00Z",
  author: { display_name: "Ada", uuid: "{ada}" },
  source: { branch: { name: "feature" }, repository: { full_name: "acme/api" } },
  destination: { branch: { name: "main" } },
  links: { html: { href: `https://bitbucket.org/acme/api/pull-requests/${id}` } },
  ...overrides,
});

describe("pullRequests.list", () => {
  it("normalizes the wire shape into domain types", async () => {
    server.use(http.get(PRS, () => HttpResponse.json(fullEnvelope([rawPr(7)]))));
    const [pr] = await collect(
      client().pullRequests.list({ workspace: "acme", repository: "api" }),
    );
    expect(pr).toMatchObject({
      id: 7,
      title: "PR 7",
      state: "open",
      author: { displayName: "Ada", uuid: "{ada}" },
      source: { name: "feature", repository: "acme/api" },
      destination: { name: "main" },
      draft: false,
    });
  });

  it("builds a BBQL query from the filter options", async () => {
    let query: string | null = null;
    server.use(
      http.get(PRS, ({ request }) => {
        query = new URL(request.url).searchParams.get("q");
        return HttpResponse.json(fullEnvelope([]));
      }),
    );
    await collect(
      client().pullRequests.list({
        workspace: "acme",
        repository: "api",
        state: ["open", "merged"],
        destinationBranch: "main",
      }),
    );
    expect(query).toBe('(state IN ("OPEN", "MERGED")) AND (destination.branch.name = "main")');
  });

  it("escapes a search term so it cannot inject BBQL clauses", async () => {
    let query: string | null = null;
    server.use(
      http.get(PRS, ({ request }) => {
        query = new URL(request.url).searchParams.get("q");
        return HttpResponse.json(fullEnvelope([]));
      }),
    );
    await collect(
      client().pullRequests.list({
        workspace: "acme",
        repository: "api",
        search: 'x" OR state = "MERGED',
      }),
    );
    expect(query).toBe('title ~ "x\\" OR state = \\"MERGED"');
  });

  it("sends a values-prefixed fields projection", async () => {
    let fields: string | null = null;
    server.use(
      http.get(PRS, ({ request }) => {
        fields = new URL(request.url).searchParams.get("fields");
        return HttpResponse.json(fullEnvelope([]));
      }),
    );
    await collect(client().pullRequests.list({ workspace: "acme", repository: "api" }));
    expect(fields).toContain("-values.links");
    expect(fields).not.toContain("-links,");
  });
});

describe("pullRequests.merge", () => {
  it("returns a merged outcome for a synchronous 200", async () => {
    server.use(
      http.post(`${PRS}/42/merge`, () => HttpResponse.json(rawPr(42, { state: "MERGED" }))),
    );
    const outcome = await client().pullRequests.merge({
      workspace: "acme",
      repository: "api",
      id: 42,
    });
    expect(outcome.status).toBe("merged");
  });

  it("sends the wire merge strategy and the required envelope type", async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post(`${PRS}/42/merge`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(rawPr(42));
      }),
    );
    await client().pullRequests.merge(
      { workspace: "acme", repository: "api", id: 42 },
      { strategy: "squash-fast-forward" },
    );
    expect(body).toMatchObject({
      type: "pullrequest_merge_parameters",
      merge_strategy: "squash_fast_forward",
    });
  });

  it("surfaces a 202 as pending rather than blocking", async () => {
    server.use(
      http.post(
        `${PRS}/42/merge`,
        () =>
          new HttpResponse(null, {
            status: 202,
            headers: { location: `${PRS}/42/merge/task-status/9` },
          }),
      ),
    );
    const outcome = await client().pullRequests.merge({
      workspace: "acme",
      repository: "api",
      id: 42,
    });
    expect(outcome.status).toBe("pending");
  });

  it("polls an async merge to completion when asked to wait", async () => {
    const task = vi
      .fn<() => Response>()
      .mockImplementationOnce(() => HttpResponse.json({ task_status: "PENDING" }))
      .mockImplementationOnce(() =>
        HttpResponse.json({
          task_status: "COMPLETED",
          merge_result: rawPr(42, { state: "MERGED" }),
        }),
      );
    server.use(
      http.post(
        `${PRS}/42/merge`,
        () =>
          new HttpResponse(null, {
            status: 202,
            headers: { location: `${PRS}/42/merge/task-status/9` },
          }),
      ),
      http.get(`${PRS}/42/merge/task-status/9`, task),
    );
    const outcome = await client().pullRequests.merge(
      { workspace: "acme", repository: "api", id: 42 },
      { wait: true },
    );
    expect(outcome.status).toBe("merged");
    expect(task).toHaveBeenCalledTimes(2);
  });
});

describe("pullRequests.setReview", () => {
  it("maps `none` onto both withdrawals and tolerates the 404 from the unset one", async () => {
    const approve = vi.fn<() => Response>(() => new HttpResponse(null, { status: 204 }));
    // Never approved, so withdrawing the change request 404s — which is success here.
    const changes = vi.fn<() => Response>(() => new HttpResponse(null, { status: 404 }));
    server.use(
      http.delete(`${PRS}/42/approve`, approve),
      http.delete(`${PRS}/42/request-changes`, changes),
    );
    await expect(
      client().pullRequests.setReview({ workspace: "acme", repository: "api", id: 42 }, "none"),
    ).resolves.toBeUndefined();
    expect(approve).toHaveBeenCalledTimes(1);
    expect(changes).toHaveBeenCalledTimes(1);
  });
});

describe("capability degradation", () => {
  it("refuses users.current() on an access token WITHOUT making a request", async () => {
    const handler = vi.fn<() => Response>(() => HttpResponse.json({}));
    server.use(http.get(`${BASE}/user`, handler));

    const scoped = createBitbucketClient({ auth: createAccessTokenAuth({ token: "rt" }) });
    await expect(scoped.users.current()).rejects.toThrow(CapabilityError);
    // The point of the capability check: no wasted round trip and no confusing 401.
    expect(handler).not.toHaveBeenCalled();
  });

  it("reports a token identity from whoami() instead of throwing", async () => {
    const scoped = createBitbucketClient({ auth: createAccessTokenAuth({ token: "rt" }) });
    expect(await scoped.users.whoami()).toEqual({ kind: "token", reason: "no-user-identity" });
  });
});
