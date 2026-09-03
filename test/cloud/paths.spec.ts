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

  it("keeps the plural/singular split between the commit list and one commit", () => {
    // Asserted so nobody makes these symmetrical. Bitbucket really does use the plural
    // for the collection and the singular for the item, and the wrong one 404s.
    expect(paths.REPO_COMMITS("acme", "api")).toBe("/repositories/acme/api/commits");
    expect(paths.COMMIT("acme", "api", "abc123")).toBe("/repositories/acme/api/commit/abc123");
    expect(paths.COMMIT_STATUSES("acme", "api", "abc123")).toBe(
      "/repositories/acme/api/commit/abc123/statuses",
    );
  });

  it("scopes the commit list to a revision when one is given", () => {
    expect(paths.REPO_COMMITS("acme", "api", "main")).toBe("/repositories/acme/api/commits/main");
  });

  it("hangs diffs off the repository rather than the commit, and keeps `..` intact", () => {
    expect(paths.DIFF("acme", "api", "abc..def")).toBe("/repositories/acme/api/diff/abc..def");
    expect(paths.DIFFSTAT("acme", "api", "abc..def")).toBe(
      "/repositories/acme/api/diffstat/abc..def",
    );
  });

  it("builds ref paths", () => {
    expect(paths.REPO_REFS_BRANCHES("acme", "api")).toBe("/repositories/acme/api/refs/branches");
    expect(paths.REPO_REFS_TAGS("acme", "api")).toBe("/repositories/acme/api/refs/tags");
  });

  it("preserves separators inside a source path but still encodes each segment", () => {
    // encodeURIComponent over the whole path would send `src%2Fa.ts`, which is a file
    // named "src/a.ts" rather than a.ts inside src/ — and 404s.
    expect(paths.REPO_SRC("acme", "api", "main", "src/a b.ts")).toBe(
      "/repositories/acme/api/src/main/src/a%20b.ts",
    );
  });

  it("asks for a directory with a trailing slash, and the default ref with neither", () => {
    expect(paths.REPO_SRC("acme", "api", "main")).toBe("/repositories/acme/api/src/main/");
    expect(paths.REPO_SRC("acme", "api")).toBe("/repositories/acme/api/src");
  });

  it("builds workspace and project paths", () => {
    expect(paths.WORKSPACE("acme")).toBe("/workspaces/acme");
    expect(paths.WORKSPACE_PROJECTS("acme")).toBe("/workspaces/acme/projects");
    expect(paths.WORKSPACE_PROJECT("acme", "PROJ")).toBe("/workspaces/acme/projects/PROJ");
  });
});
