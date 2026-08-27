import { describe, expect, it } from "vitest";

import { parseBitbucketRemote, parseRepoSpec } from "../../src/git/remote.js";

describe("parseBitbucketRemote", () => {
  const cases: readonly [
    string,
    string,
    { workspace: string; repository: string; protocol: string },
  ][] = [
    [
      "scp-like",
      "git@bitbucket.org:acme/api.git",
      { workspace: "acme", repository: "api", protocol: "ssh" },
    ],
    [
      "ssh url",
      "ssh://git@bitbucket.org/acme/api.git",
      { workspace: "acme", repository: "api", protocol: "ssh" },
    ],
    [
      "alt-ssh host on 443",
      "ssh://git@altssh.bitbucket.org:443/acme/api.git",
      { workspace: "acme", repository: "api", protocol: "ssh" },
    ],
    [
      "https",
      "https://bitbucket.org/acme/api.git",
      { workspace: "acme", repository: "api", protocol: "https" },
    ],
    [
      "https with userinfo and no .git",
      "https://olivier@bitbucket.org/acme/api",
      { workspace: "acme", repository: "api", protocol: "https" },
    ],
    [
      "trailing slash",
      "https://bitbucket.org/acme/api/",
      { workspace: "acme", repository: "api", protocol: "https" },
    ],
  ];

  for (const [label, url, expected] of cases) {
    it(`parses the ${label} form`, () => {
      expect(parseBitbucketRemote("origin", url)).toMatchObject(expected);
    });
  }

  it("never lets an embedded token reach the parsed url", () => {
    const remote = parseBitbucketRemote(
      "origin",
      "https://x-token-auth:SUPERSECRET@bitbucket.org/acme/api.git",
    );
    expect(remote?.workspace).toBe("acme");
    expect(JSON.stringify(remote)).not.toContain("SUPERSECRET");
  });

  it("ignores remotes on other hosts", () => {
    expect(parseBitbucketRemote("origin", "git@github.com:acme/api.git")).toBeUndefined();
  });

  it("ignores a bitbucket url that is not a repository", () => {
    expect(parseBitbucketRemote("origin", "https://bitbucket.org/acme")).toBeUndefined();
  });
});

describe("parseRepoSpec", () => {
  it("splits workspace and repository", () => {
    expect(parseRepoSpec("acme/api")).toEqual({ workspace: "acme", repository: "api" });
  });

  it("rejects anything that is not exactly two segments", () => {
    expect(() => parseRepoSpec("api")).toThrow(/workspace\/repo/);
    expect(() => parseRepoSpec("a/b/c")).toThrow(/workspace\/repo/);
  });
});
