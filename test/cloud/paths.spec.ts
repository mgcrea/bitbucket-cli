import { describe, expect, it } from "vitest";

import * as paths from "../../src/cloud/paths.js";

describe("cloud paths", () => {
  it("builds pull-request paths", () => {
    expect(paths.PULL_REQUEST("acme", "api", 42)).toBe("/repositories/acme/api/pullrequests/42");
    expect(paths.PULL_REQUEST_MERGE("acme", "api", 42)).toBe(
      "/repositories/acme/api/pullrequests/42/merge",
    );
  });

  it("percent-encodes path segments", () => {
    expect(paths.REPOSITORY("acme corp", "my/repo")).toBe("/repositories/acme%20corp/my%2Frepo");
  });

  it("keeps the underscore/hyphen split between variable endpoints", () => {
    // These asserted literals exist so nobody "fixes" the inconsistency. Bitbucket
    // really did ship both spellings, and the wrong one 404s.
    expect(paths.REPO_PIPELINE_VARIABLES("acme", "api")).toBe(
      "/repositories/acme/api/pipelines_config/variables",
    );
    expect(paths.WORKSPACE_PIPELINE_VARIABLES("acme")).toBe(
      "/workspaces/acme/pipelines-config/variables",
    );
    expect(paths.DEPLOYMENT_VARIABLES("acme", "api", "{env}")).toBe(
      "/repositories/acme/api/deployments_config/environments/%7Benv%7D/variables",
    );
  });
});
