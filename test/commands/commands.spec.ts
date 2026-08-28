import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { fullEnvelope } from "../helpers/page.js";
import { runCli } from "../helpers/run-cli.js";
import { server } from "../msw-server.js";

const BASE = "https://api.bitbucket.org/2.0";
const REPO = ["--repo", "acme/api"];

describe("bb issue", () => {
  it("refuses with a distinct exit code and nothing on stdout", async () => {
    const result = await runCli(["issue", "list"]);
    expect(result.exitCode).toBe(10);
    expect(result.stderr).toMatch(/removed the issue tracker API/);
    // A failing command must leave a pipe clean.
    expect(result.stdout).toBe("");
  });
});

describe("bb repo list", () => {
  it("requires a workspace and points at the discovery command", async () => {
    const result = await runCli(["repo", "list"]);
    expect(result.exitCode).toBe(2);
    // Cross-workspace listing was removed, so there is no sensible default.
    expect(result.stderr).toMatch(/bb workspace list/);
  });

  it("lists repositories for a workspace", async () => {
    server.use(
      http.get(`${BASE}/repositories/acme`, () =>
        HttpResponse.json(
          fullEnvelope([
            {
              full_name: "acme/api",
              slug: "api",
              is_private: true,
              updated_on: "2026-08-01T00:00:00Z",
            },
          ]),
        ),
      ),
    );
    const result = await runCli(["repo", "list", "-W", "acme"], { io: { isTTY: false } });
    expect(result.stdout).toContain("acme/api\tprivate");
  });
});

describe("bb workspace list", () => {
  it("unwraps the workspace_access envelope", async () => {
    server.use(
      http.get(`${BASE}/user/workspaces`, () =>
        HttpResponse.json(
          fullEnvelope([{ administrator: true, workspace: { slug: "acme", uuid: "{w}" } }]),
        ),
      ),
    );
    const result = await runCli(["workspace", "list"], { io: { isTTY: false } });
    expect(result.stdout).toBe("acme\tacme\tadmin\n");
  });
});

describe("bb pipeline list", () => {
  const PIPELINES = `${BASE}/repositories/acme/api/pipelines`;

  it("rejects an unknown status before making a request", async () => {
    const list = vi.fn<() => Response>(() => HttpResponse.json(fullEnvelope([])));
    server.use(http.get(PIPELINES, list));
    const result = await runCli(["pipeline", "list", "--status", "borked", ...REPO]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(/Unknown status "borked"/);
    expect(list).not.toHaveBeenCalled();
  });

  it("flattens the nested state union into one status column", async () => {
    server.use(
      http.get(PIPELINES, () =>
        HttpResponse.json(
          fullEnvelope([
            {
              uuid: "{p}",
              build_number: 7,
              // COMPLETED at the top with the outcome underneath: reading state.name
              // alone could not tell success from failure.
              state: { name: "COMPLETED", result: { name: "FAILED" } },
              created_on: "2026-08-01T10:00:00Z",
              target: { ref_type: "branch", ref_name: "main" },
              trigger: { name: "PUSH" },
            },
          ]),
        ),
      ),
    );
    const result = await runCli(["pipeline", "list", ...REPO], { io: { isTTY: false } });
    expect(result.stdout).toContain("7\tfailed\tmain");
  });
});

describe("bb browse", () => {
  it("prints the URL rather than opening a browser when piped", async () => {
    const result = await runCli(["browse", ...REPO], { io: { isTTY: false } });
    expect(result.stdout).toBe("https://bitbucket.org/acme/api\n");
  });

  it("builds a pull request URL", async () => {
    const result = await runCli(["browse", "--pr", "42", ...REPO], { io: { isTTY: false } });
    expect(result.stdout.trim()).toBe("https://bitbucket.org/acme/api/pull-requests/42");
  });

  it("rejects a non-numeric pull request", async () => {
    const result = await runCli(["browse", "--pr", "abc", ...REPO], { io: { isTTY: false } });
    expect(result.exitCode).toBe(2);
  });

  it("percent-encodes each path segment separately", async () => {
    const result = await runCli(["browse", "src/a b.ts", ...REPO], { io: { isTTY: false } });
    // The slash must stay a separator; only the segment content is encoded. The ref is
    // whatever branch the test happens to run on, so it is not asserted here.
    expect(result.stdout.trim()).toMatch(/\/src\/[^/]+\/src\/a%20b\.ts$/);
  });
});

describe("bb api", () => {
  it("normalises a path that already carries the version prefix", async () => {
    let seen = "";
    server.use(
      http.get(`${BASE}/user`, ({ request }) => {
        seen = request.url;
        return HttpResponse.json({ display_name: "Ada" });
      }),
    );
    await runCli(["api", "/2.0/user"]);
    expect(seen).toBe(`${BASE}/user`);
  });

  it("turns -f into query parameters on an explicit GET", async () => {
    let seen = "";
    server.use(
      http.get(`${BASE}/user`, ({ request }) => {
        seen = request.url;
        return HttpResponse.json({});
      }),
    );
    // Parameters imply POST unless the method is stated, which is gh's convention.
    await runCli(["api", "/user", "-X", "GET", "-f", "fields=+values.x"]);
    // URLSearchParams encodes the `+` as %2B; unencoded it would decode to a space.
    expect(seen).toContain("fields=%2Bvalues.x");
  });

  it("switches to POST and a body when fields are given with -F", async () => {
    let method = "";
    let body: unknown;
    server.use(
      http.post(`${BASE}/thing`, async ({ request }) => {
        method = request.method;
        body = await request.json();
        return HttpResponse.json({ ok: true });
      }),
    );
    await runCli(["api", "/thing", "-F", "count=3", "-F", "on=true"]);
    expect(method).toBe("POST");
    expect(body).toEqual({ count: 3, on: true });
  });
});
