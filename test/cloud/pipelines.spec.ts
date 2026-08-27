import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { createApiTokenAuth } from "../../src/auth/api-token.js";
import { createBitbucketClient } from "../../src/client/bitbucket-client.js";
import { normalizeStatus } from "../../src/cloud/normalize/pipeline.js";
import { collect } from "../../src/pagination/collect.js";
import { fullEnvelope } from "../helpers/page.js";
import { server } from "../msw-server.js";

const BASE = "https://api.bitbucket.org/2.0";
const PIPELINES = `${BASE}/repositories/acme/api/pipelines`;
const client = () => createBitbucketClient({ auth: createApiTokenAuth({ token: "t" }) });
const repo = { workspace: "acme", repository: "api" };

const completed = (result: string, error?: Record<string, unknown>): Record<string, unknown> => ({
  name: "COMPLETED",
  type: "pipeline_state_completed",
  result: {
    name: result,
    type: `pipeline_state_completed_${result.toLowerCase()}`,
    ...error,
  },
});

const run = (buildNumber: number, state: Record<string, unknown>): Record<string, unknown> => ({
  uuid: `{u${buildNumber}}`,
  build_number: buildNumber,
  state,
  created_on: "2026-08-01T10:00:00Z",
  duration_in_seconds: 52,
  creator: { display_name: "Ada" },
  trigger: { name: "PUSH" },
  target: {
    ref_type: "branch",
    ref_name: "main",
    selector: { type: "custom", pattern: "docker-build" },
    commit: { hash: "abc123def" },
  },
});

describe("normalizeStatus", () => {
  it("flattens the nested completed union rather than reading only state.name", () => {
    // A finished run reports COMPLETED at the top level with the outcome underneath, so
    // state.name alone cannot tell success from failure.
    expect(normalizeStatus(completed("SUCCESSFUL"))).toBe("successful");
    expect(normalizeStatus(completed("FAILED"))).toBe("failed");
    expect(normalizeStatus(completed("STOPPED"))).toBe("stopped");
  });

  it("maps the in-flight states", () => {
    expect(normalizeStatus({ name: "PENDING" })).toBe("pending");
    expect(normalizeStatus({ name: "IN_PROGRESS" })).toBe("in-progress");
  });

  it("degrades to unknown rather than throwing on an unrecognised shape", () => {
    expect(normalizeStatus(undefined)).toBe("unknown");
    expect(normalizeStatus({ name: "SOMETHING_NEW" })).toBe("unknown");
  });
});

describe("pipelines.list", () => {
  it("normalizes a run into flat domain fields", async () => {
    server.use(
      http.get(PIPELINES, () =>
        HttpResponse.json(fullEnvelope([run(279, completed("SUCCESSFUL"))])),
      ),
    );
    const [pipeline] = await collect(client().pipelines.list(repo));
    expect(pipeline).toMatchObject({
      buildNumber: 279,
      status: "successful",
      stateName: "COMPLETED",
      refName: "main",
      selector: "docker-build",
      commit: "abc123def",
      trigger: "PUSH",
      creator: "Ada",
      durationSeconds: 52,
    });
  });

  it("defaults to newest first", async () => {
    let sort: string | null = null;
    server.use(
      http.get(PIPELINES, ({ request }) => {
        sort = new URL(request.url).searchParams.get("sort");
        return HttpResponse.json(fullEnvelope([]));
      }),
    );
    await collect(client().pipelines.list(repo));
    // Bitbucket's own default is oldest first, which surfaces a years-old run.
    expect(sort).toBe("-created_on");
  });

  it("surfaces the failure reason Bitbucket supplies", async () => {
    server.use(
      http.get(PIPELINES, () =>
        HttpResponse.json(
          fullEnvelope([
            run(276, completed("FAILED", { error: { message: "pipelines section is missing" } })),
          ]),
        ),
      ),
    );
    const [pipeline] = await collect(client().pipelines.list(repo));
    expect(pipeline?.errorMessage).toBe("pipelines section is missing");
  });

  it("filters by status client-side, since it is not addressable via BBQL", async () => {
    server.use(
      http.get(PIPELINES, () =>
        HttpResponse.json(
          fullEnvelope([
            run(3, completed("SUCCESSFUL")),
            run(2, completed("FAILED")),
            run(1, completed("STOPPED")),
          ]),
        ),
      ),
    );
    const failures = await collect(
      client().pipelines.list({ ...repo, status: ["failed", "stopped"] }),
    );
    expect(failures.map((p) => p.buildNumber)).toEqual([2, 1]);
  });
});

describe("error envelopes", () => {
  it("reads an envelope that omits the top-level `type`", async () => {
    // The pipeline log endpoint answers `{"error": {...}}` with no `type`. Requiring
    // `type` discarded the API's explanation on exactly those responses.
    server.use(
      http.get(`${PIPELINES}/%7Bu1%7D`, () =>
        HttpResponse.json(
          { error: { message: "Not Found", detail: "Log in step {s} does not exist." } },
          { status: 404 },
        ),
      ),
    );
    await expect(client().pipelines.get(repo, "{u1}")).rejects.toThrow(
      "Log in step {s} does not exist.",
    );
  });
});
