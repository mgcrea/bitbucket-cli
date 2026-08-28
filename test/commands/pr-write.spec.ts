import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { fullEnvelope } from "../helpers/page.js";
import { runCli } from "../helpers/run-cli.js";
import { server } from "../msw-server.js";

const BASE = "https://api.bitbucket.org/2.0";
const PRS = `${BASE}/repositories/acme/api/pullrequests`;
const REPO = ["--repo", "acme/api"];

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

describe("bb pr merge", () => {
  it("refuses to merge without confirmation when not interactive", async () => {
    const merge = vi.fn<() => Response>(() => HttpResponse.json(rawPr(42)));
    server.use(http.post(`${PRS}/42/merge`, merge));

    const result = await runCli(["pr", "merge", "42", ...REPO]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(/without confirmation/);
    // The guard has to hold before the request, not after it.
    expect(merge).not.toHaveBeenCalled();
  });

  it("merges once --yes is given", async () => {
    server.use(
      http.post(`${PRS}/42/merge`, () => HttpResponse.json(rawPr(42, { state: "MERGED" }))),
    );
    const result = await runCli(["pr", "merge", "42", "--yes", ...REPO]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toMatch(/Merged #42/);
  });

  it("rejects an unknown merge strategy before making a request", async () => {
    const merge = vi.fn<() => Response>(() => HttpResponse.json(rawPr(42)));
    server.use(http.post(`${PRS}/42/merge`, merge));

    const result = await runCli(["pr", "merge", "42", "--yes", "--strategy", "rebase", ...REPO]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(/Unknown merge strategy "rebase"/);
    expect(merge).not.toHaveBeenCalled();
  });

  it("maps --squash onto the wire strategy", async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post(`${PRS}/42/merge`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(rawPr(42));
      }),
    );
    await runCli(["pr", "merge", "42", "--yes", "--squash", "--delete-branch", ...REPO]);
    expect(body).toMatchObject({ merge_strategy: "squash", close_source_branch: true });
  });
});

describe("bb pr close", () => {
  it("refuses without confirmation, and says why it cannot be undone", async () => {
    const decline = vi.fn<() => Response>(() => HttpResponse.json(rawPr(42)));
    server.use(http.post(`${PRS}/42/decline`, decline));

    const result = await runCli(["pr", "close", "42", ...REPO]);

    expect(result.exitCode).toBe(2);
    // Bitbucket Cloud has no reopen endpoint, so this genuinely is one-way.
    expect(result.stderr).toMatch(/no reopen endpoint/);
    expect(decline).not.toHaveBeenCalled();
  });

  it("declines with --yes", async () => {
    server.use(
      http.post(`${PRS}/42/decline`, () => HttpResponse.json(rawPr(42, { state: "DECLINED" }))),
    );
    const result = await runCli(["pr", "close", "42", "--yes", ...REPO]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toMatch(/Declined #42/);
  });
});

describe("bb pr review", () => {
  it("rejects more than one decision", async () => {
    const result = await runCli(["pr", "review", "42", "--approve", "--request-changes", ...REPO]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(/only one of/);
  });

  it("rejects a call that would do nothing", async () => {
    const result = await runCli(["pr", "review", "42", ...REPO]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(/Nothing to do/);
  });

  it("posts an approval", async () => {
    const approve = vi.fn<() => Response>(() => new HttpResponse(null, { status: 200 }));
    server.use(http.post(`${PRS}/42/approve`, approve));
    const result = await runCli(["pr", "review", "42", "--approve", ...REPO]);
    expect(result.exitCode).toBe(0);
    expect(approve).toHaveBeenCalledTimes(1);
  });

  it("withdraws both states for --unapprove, tolerating the 404 from the unset one", async () => {
    const approve = vi.fn<() => Response>(() => new HttpResponse(null, { status: 204 }));
    const changes = vi.fn<() => Response>(() => new HttpResponse(null, { status: 404 }));
    server.use(
      http.delete(`${PRS}/42/approve`, approve),
      http.delete(`${PRS}/42/request-changes`, changes),
    );
    const result = await runCli(["pr", "review", "42", "--unapprove", ...REPO]);
    expect(result.exitCode).toBe(0);
    expect(approve).toHaveBeenCalledTimes(1);
    expect(changes).toHaveBeenCalledTimes(1);
  });
});

describe("bb pr comment", () => {
  it("requires a body", async () => {
    const result = await runCli(["pr", "comment", "42", ...REPO]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(/body is required/);
  });

  it("requires --path alongside --line", async () => {
    const result = await runCli(["pr", "comment", "42", "-b", "x", "--line", "12", ...REPO]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(/--line needs --path/);
  });

  it("sends an inline anchor when both are given", async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post(`${PRS}/42/comments`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 1, content: { raw: "x" } });
      }),
    );
    await runCli(["pr", "comment", "42", "-b", "x", "--path", "a.ts", "--line", "12", ...REPO]);
    expect(body).toMatchObject({ inline: { path: "a.ts", to: 12 } });
  });
});

describe("bb pr list output modes", () => {
  it("prints TSV with no header when piped", async () => {
    server.use(http.get(PRS, () => HttpResponse.json(fullEnvelope([rawPr(7)]))));
    const result = await runCli(["pr", "list", ...REPO], { io: { isTTY: false } });
    expect(result.stdout).toBe("7\tPR 7\tfeature\tOPEN\n");
  });

  it("prints a header and padding on a terminal", async () => {
    server.use(http.get(PRS, () => HttpResponse.json(fullEnvelope([rawPr(7)]))));
    const result = await runCli(["pr", "list", ...REPO], { io: { isTTY: true, width: 80 } });
    expect(result.stdout.split("\n")[0]).toMatch(/^ID\s+TITLE\s+BRANCH\s+STATE/);
  });

  it("lists the available fields for a bare --json, with no request", async () => {
    const list = vi.fn<() => Response>(() => HttpResponse.json(fullEnvelope([])));
    server.use(http.get(PRS, list));
    const result = await runCli(["pr", "list", "--json", ...REPO]);
    expect(result.stdout.split("\n")).toContain("title");
    expect(list).not.toHaveBeenCalled();
  });

  it("rejects an unknown --json field with a suggestion", async () => {
    server.use(http.get(PRS, () => HttpResponse.json(fullEnvelope([rawPr(7)]))));
    const result = await runCli(["pr", "list", "--json", "titel", ...REPO]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(/Did you mean "title"/);
  });
});
