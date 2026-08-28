import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { fullEnvelope } from "../helpers/page.js";
import { runCli } from "../helpers/run-cli.js";
import { server } from "../msw-server.js";

const BASE = "https://api.bitbucket.org/2.0";
const PIPELINES = `${BASE}/repositories/acme/api/pipelines`;
const REPO = ["--repo", "acme/api"];

const started = {
  uuid: "{p}",
  build_number: 9,
  state: { name: "PENDING" },
  created_on: "2026-08-01T00:00:00Z",
};

const captureBody = (): { body: Record<string, unknown> } => {
  const captured = { body: {} as Record<string, unknown> };
  server.use(
    http.post(PIPELINES, async ({ request }) => {
      captured.body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(started);
    }),
  );
  return captured;
};

describe("bb pipeline run", () => {
  it("builds a ref target", async () => {
    const captured = captureBody();
    await runCli(["pipeline", "run", "--ref", "main", ...REPO]);
    expect(captured.body["target"]).toEqual({
      type: "pipeline_ref_target",
      ref_type: "branch",
      ref_name: "main",
    });
  });

  it("attaches a custom pipeline as a selector", async () => {
    const captured = captureBody();
    await runCli(["pipeline", "run", "docker-build", "--ref", "main", ...REPO]);
    expect(captured.body["target"]).toMatchObject({
      selector: { type: "custom", pattern: "docker-build" },
    });
  });

  it("builds a commit target when --commit is given", async () => {
    const captured = captureBody();
    await runCli(["pipeline", "run", "--commit", "abc123", "--ref", "main", ...REPO]);
    expect(captured.body["target"]).toMatchObject({
      type: "pipeline_commit_target",
      commit: { type: "commit", hash: "abc123" },
    });
  });

  it("marks --tag as a tag ref", async () => {
    const captured = captureBody();
    await runCli(["pipeline", "run", "--ref", "v1.0.0", "--tag", ...REPO]);
    expect(captured.body["target"]).toMatchObject({ ref_type: "tag", ref_name: "v1.0.0" });
  });

  it("collects every repeated variable, and marks secured ones", async () => {
    const captured = captureBody();
    await runCli([
      "pipeline",
      "run",
      "--ref",
      "main",
      "-v",
      "A=1",
      "-v",
      "B=2",
      "--secured",
      "TOKEN=xyz",
      ...REPO,
    ]);
    // citty would otherwise keep only the last -v.
    expect(captured.body["variables"]).toEqual([
      { key: "A", value: "1", secured: false },
      { key: "B", value: "2", secured: false },
      { key: "TOKEN", value: "xyz", secured: true },
    ]);
  });

  it("keeps an equals sign inside a variable value", async () => {
    const captured = captureBody();
    await runCli(["pipeline", "run", "--ref", "main", "-v", "Q=a=b", ...REPO]);
    expect(captured.body["variables"]).toEqual([{ key: "Q", value: "a=b", secured: false }]);
  });

  it("rejects a variable that is not KEY=VALUE", async () => {
    const result = await runCli(["pipeline", "run", "--ref", "main", "-v", "oops", ...REPO]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(/Expected KEY=VALUE/);
  });
});

describe("bb pipeline stop", () => {
  it("stops the running pipeline when given no argument", async () => {
    let stopped = "";
    server.use(
      http.get(PIPELINES, () =>
        HttpResponse.json(
          fullEnvelope([{ uuid: "{r}", build_number: 5, state: { name: "IN_PROGRESS" } }]),
        ),
      ),
      http.post(`${PIPELINES}/%7Br%7D/stopPipeline`, ({ request }) => {
        stopped = request.url;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const result = await runCli(["pipeline", "stop", ...REPO]);
    expect(result.stderr).toMatch(/Stopped #5/);
    expect(stopped).toContain("stopPipeline");
  });

  it("reports when there is nothing running", async () => {
    server.use(http.get(PIPELINES, () => HttpResponse.json(fullEnvelope([]))));
    const result = await runCli(["pipeline", "stop", ...REPO]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(/No running pipeline/);
  });
});
