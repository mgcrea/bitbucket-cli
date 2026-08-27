import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { createApiTokenAuth } from "../../src/auth/api-token.js";
import { createBitbucketClient } from "../../src/client/bitbucket-client.js";
import { collect } from "../../src/pagination/collect.js";
import { fullEnvelope } from "../helpers/page.js";
import { server } from "../msw-server.js";

const BASE = "https://api.bitbucket.org/2.0";
const COMMENTS = `${BASE}/repositories/acme/api/pullrequests/42/comments`;
const client = () => createBitbucketClient({ auth: createApiTokenAuth({ token: "t" }) });
const ref = { workspace: "acme", repository: "api", id: 42 };

describe("pull request comments", () => {
  it("normalizes a comment, including its inline anchor", async () => {
    server.use(
      http.get(COMMENTS, () =>
        HttpResponse.json(
          fullEnvelope([
            {
              id: 7,
              content: { raw: "this leaks" },
              user: { display_name: "Ada" },
              created_on: "2026-08-01T10:00:00Z",
              inline: { path: "src/app.ts", to: 12, from: null },
            },
          ]),
        ),
      ),
    );
    const [comment] = await collect(client().pullRequests.comments(ref));
    expect(comment).toMatchObject({
      id: 7,
      content: "this leaks",
      author: { displayName: "Ada" },
      inline: { path: "src/app.ts", to: 12 },
    });
    // `from: null` must become undefined rather than leaking a null into the domain.
    expect(comment?.inline?.from).toBeUndefined();
  });

  it("sends content.raw for a plain comment", async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post(COMMENTS, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 1, content: { raw: "hi" } });
      }),
    );
    await client().pullRequests.addComment(ref, { body: "hi" });
    expect(body).toEqual({ content: { raw: "hi" } });
  });

  it("sends the inline anchor and the parent for a threaded reply", async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post(COMMENTS, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 2 });
      }),
    );
    await client().pullRequests.addComment(ref, {
      body: "reply",
      parentId: 7,
      inline: { path: "src/app.ts", to: 12 },
    });
    expect(body).toEqual({
      content: { raw: "reply" },
      parent: { id: 7 },
      inline: { path: "src/app.ts", to: 12 },
    });
  });
});
