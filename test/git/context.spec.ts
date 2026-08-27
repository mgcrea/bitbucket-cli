import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { listBitbucketRemotes, resolveRepoContext } from "../../src/git/context.js";
import { buildPullRequestDraft } from "../../src/git/fill.js";
import { commitsBetween, currentBranch } from "../../src/git/log.js";
import { RepoContextError } from "../../src/http/errors.js";

/**
 * A real repository rather than a mock: this exercises the actual parsing, and building
 * one costs a few hundred milliseconds.
 */
let cwd = "";

const git = (...args: string[]): void => {
  execFileSync("git", args, { cwd, stdio: "pipe" });
};

beforeAll(() => {
  cwd = mkdtempSync(join(tmpdir(), "bb-git-"));
  git("init", "-q", "-b", "main");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "Test");
  // A root commit so `main~1` resolves in the range test below.
  git("commit", "-q", "--allow-empty", "-m", "Initial commit");
  writeFileSync(join(cwd, "a.txt"), "one\n");
  git("add", "-A");
  git("commit", "-q", "-m", "Add the first file", "-m", "A body paragraph.\n\nAnd a second one.");
  git("checkout", "-q", "-b", "feature/add-oauth");
  writeFileSync(join(cwd, "b.txt"), "two\n");
  git("add", "-A");
  git("commit", "-q", "-m", "Add the second file");
  git("remote", "add", "origin", "git@bitbucket.org:acme/api.git");
});

afterAll(() => {
  rmSync(cwd, { recursive: true, force: true });
});

afterEach(() => {
  delete process.env["BB_REPO"];
});

describe("git context", () => {
  it("reads the current branch", async () => {
    expect(await currentBranch({ cwd })).toBe("feature/add-oauth");
  });

  it("finds bitbucket remotes and ignores others", async () => {
    git("remote", "add", "gh", "git@github.com:acme/api.git");
    const remotes = await listBitbucketRemotes({ cwd });
    expect(remotes.map((remote) => remote.name)).toEqual(["origin"]);
    git("remote", "remove", "gh");
  });

  it("infers the repository from the remote", async () => {
    expect(await resolveRepoContext({ cwd })).toMatchObject({
      workspace: "acme",
      repository: "api",
      source: "remote",
    });
  });

  it("lets --repo win over the remote", async () => {
    expect(await resolveRepoContext({ cwd, override: "other/thing" })).toMatchObject({
      workspace: "other",
      repository: "thing",
      source: "flag",
    });
  });

  it("lets BB_REPO win over the remote", async () => {
    process.env["BB_REPO"] = "env/repo";
    expect(await resolveRepoContext({ cwd })).toMatchObject({ source: "env", workspace: "env" });
  });

  it("fails with the candidates when several bitbucket remotes are ambiguous", async () => {
    git("remote", "add", "fork", "git@bitbucket.org:me/api.git");
    git("remote", "add", "mirror", "git@bitbucket.org:mirror/api.git");
    git("remote", "remove", "origin");
    await expect(resolveRepoContext({ cwd })).rejects.toThrow(RepoContextError);
    await expect(resolveRepoContext({ cwd })).rejects.toThrow(/fork, mirror/);
    git("remote", "remove", "fork");
    git("remote", "remove", "mirror");
    git("remote", "add", "origin", "git@bitbucket.org:acme/api.git");
  });

  it("splits commit records on separators, so multi-paragraph bodies survive", async () => {
    const commits = await commitsBetween("main", "HEAD", { cwd });
    expect(commits).toHaveLength(1);
    expect(commits[0]?.subject).toBe("Add the second file");

    const all = await commitsBetween("main~1", "HEAD", { cwd });
    const first = all.find((commit) => commit.subject === "Add the first file");
    expect(first?.body).toContain("A body paragraph.");
    expect(first?.body).toContain("And a second one.");
  });
});

describe("buildPullRequestDraft", () => {
  it("uses the single commit's subject and body verbatim", () => {
    expect(
      buildPullRequestDraft(
        [{ hash: "a", subject: "Fix the thing", body: "Because it broke.", author: "", date: "" }],
        "feature/fix",
      ),
    ).toEqual({ title: "Fix the thing", description: "Because it broke.", commitCount: 1 });
  });

  it("humanizes the branch and lists subjects oldest-first for several commits", () => {
    const draft = buildPullRequestDraft(
      [
        { hash: "b", subject: "Second", body: "", author: "", date: "" },
        { hash: "a", subject: "First", body: "", author: "", date: "" },
      ],
      "feature/add-oauth-support",
    );
    expect(draft.title).toBe("Add oauth support");
    expect(draft.description).toBe("- First\n- Second");
    expect(draft.commitCount).toBe(2);
  });

  it("falls back to the branch name when there are no commits", () => {
    expect(buildPullRequestDraft([], "feature/empty")).toMatchObject({
      title: "Empty",
      commitCount: 0,
    });
  });
});
