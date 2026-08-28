import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { workspaceFromArgs } from "../../src/commands/context.js";
import { readConfig, writeConfig } from "../../src/config/config.js";
import { SETTING_KEYS } from "../../src/config/settings.js";
import { runCli } from "../helpers/run-cli.js";

// A directory that is deliberately not a git repository, so the inference step in
// `workspaceFromArgs` reliably finds nothing.
let elsewhere = "";

beforeEach(() => {
  elsewhere = mkdtempSync(join(tmpdir(), "bb-not-a-repo-"));
});

afterEach(async () => {
  rmSync(elsewhere, { recursive: true, force: true });
  await writeConfig({});
  delete process.env["BB_WORKSPACE"];
  delete process.env["BB_REPO"];
});

describe("bb config set", () => {
  it("rejects an unknown key and names the ones that exist", async () => {
    const result = await runCli(["config", "set", "defualt_workspace", "acme"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("default_workspace");
    // The whole point of a closed registry: a typo cannot be silently accepted.
    expect(await readConfig()).toEqual({});
  });

  it("rejects a value outside an enum setting", async () => {
    const result = await runCli(["config", "set", "git_protocol", "ftp"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(/https, ssh/);
  });

  it("round-trips through get", async () => {
    await runCli(["config", "set", "git_protocol", "ssh"]);
    const result = await runCli(["config", "get", "git_protocol"]);
    expect(result.stdout).toBe("ssh\n");
  });

  it("deletes the key when the value is empty rather than storing a blank", async () => {
    await runCli(["config", "set", "default_workspace", "acme"]);
    await runCli(["config", "set", "default_workspace", ""]);
    expect(await readConfig()).toEqual({});
  });

  it("leaves aliases alone", async () => {
    await writeConfig({ aliases: { prs: "pr list" } });
    await runCli(["config", "set", "git_protocol", "ssh"]);
    expect(await readConfig()).toEqual({ aliases: { prs: "pr list" }, git_protocol: "ssh" });
  });
});

describe("bb config get", () => {
  it("prints nothing and exits 0 when the setting is unset", async () => {
    const result = await runCli(["config", "get", "default_workspace"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
  });
});

describe("bb config list", () => {
  it("lists every known setting, not only the ones in the file", async () => {
    await runCli(["config", "set", "git_protocol", "ssh"]);
    const result = await runCli(["config", "list"], { io: { isTTY: false } });
    for (const key of SETTING_KEYS) {
      expect(result.stdout).toContain(key);
    }
    expect(result.stdout).toContain("ssh");
  });
});

describe("workspace precedence", () => {
  it("prefers the flag over everything", async () => {
    await writeConfig({ default_workspace: "from-config" });
    process.env["BB_WORKSPACE"] = "from-env";
    expect(await workspaceFromArgs({ workspace: "from-flag" }, { cwd: elsewhere })).toBe(
      "from-flag",
    );
  });

  it("prefers the environment over the config file", async () => {
    await writeConfig({ default_workspace: "from-config" });
    process.env["BB_WORKSPACE"] = "from-env";
    expect(await workspaceFromArgs({}, { cwd: elsewhere })).toBe("from-env");
  });

  it("prefers the current clone over the config file", async () => {
    await writeConfig({ default_workspace: "from-config" });
    // BB_REPO is what `resolveRepoContext` reads before touching git, so this stands in
    // for being inside a clone without needing one on disk.
    process.env["BB_REPO"] = "inferred/api";
    expect(await workspaceFromArgs({}, { cwd: elsewhere })).toBe("inferred");
  });

  it("falls back to default_workspace when nothing else applies", async () => {
    await writeConfig({ default_workspace: "from-config" });
    expect(await workspaceFromArgs({}, { cwd: elsewhere })).toBe("from-config");
  });

  it("errors with the flag and the config command named when nothing applies", async () => {
    await expect(workspaceFromArgs({}, { cwd: elsewhere })).rejects.toThrow(/--workspace/);
  });
});

describe("bb config list piping", () => {
  it("leaves an unset value as an empty field rather than a label", async () => {
    const result = await runCli(["config", "list"], { io: { isTTY: false } });
    expect(result.stdout).not.toContain("(unset)");
    expect(result.stdout).toContain("default_workspace\t\t");
  });

  it("labels an unset value when a human is reading it", async () => {
    const result = await runCli(["config", "list"], { io: { isTTY: true, width: 100 } });
    expect(result.stdout).toContain("(unset)");
  });
});
