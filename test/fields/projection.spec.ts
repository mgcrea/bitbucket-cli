import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { buildFields, forCollection } from "../../src/fields/projection.js";
import { HttpClient } from "../../src/http/http-client.js";
import { server } from "../msw-server.js";

const BASE = "https://api.bitbucket.org/2.0";

describe("buildFields", () => {
  it("joins terms and keeps the `+` literal for URLSearchParams to encode", () => {
    expect(buildFields(["-links", "+reviewers"])).toBe("-links,+reviewers");
  });

  it("merges projections and drops duplicates", () => {
    expect(buildFields(["-links"], ["-links", "id"])).toBe("-links,id");
  });

  it("returns undefined when there is nothing to project", () => {
    expect(buildFields(undefined, [])).toBeUndefined();
  });

  it("rejects an already-encoded `+`, which would become %252B on the wire", () => {
    expect(() => buildFields(["%2Breviewers"])).toThrow(/already percent-encoded/);
  });

  it("rejects terms carrying reserved characters", () => {
    expect(() => buildFields(["id&sort=x"])).toThrow(/reserved character/);
    expect(() => buildFields(["id title"])).toThrow(/reserved character/);
  });
});

describe("forCollection", () => {
  it("prefixes plain and signed terms with `values.`", () => {
    expect(forCollection(["-links", "+reviewers"])).toEqual(["-values.links", "+values.reviewers"]);
  });

  it("re-adds the envelope keys to a whitelist so pagination cannot break", () => {
    // Without this a whitelist strips `next`, silently truncating at one page.
    expect(forCollection(["id", "title"])).toEqual([
      "next",
      "page",
      "pagelen",
      "size",
      "values.id",
      "values.title",
    ]);
  });

  it("leaves a purely subtractive projection alone", () => {
    expect(forCollection(["-links"])).toEqual(["-values.links"]);
  });

  it("passes the discovery wildcard through untouched", () => {
    expect(forCollection(["*"])).toEqual(["*"]);
  });
});

describe("wire encoding", () => {
  it("sends `+` as %2B, not as a space", async () => {
    let requested = "";
    server.use(
      http.get(`${BASE}/pullrequests`, ({ request }) => {
        requested = request.url;
        return HttpResponse.json({ values: [] });
      }),
    );
    await new HttpClient().request({
      path: "/pullrequests",
      query: { fields: buildFields(["+reviewers", "-links"]) },
    });
    // An unencoded `+` would decode server-side to a space and silently match nothing.
    expect(requested).toContain("fields=%2Breviewers%2C-links");
    expect(requested).not.toContain("fields=+reviewers");
  });
});
