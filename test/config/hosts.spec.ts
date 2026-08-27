import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { deleteCredential, readCredential, writeCredential } from "../../src/config/hosts.js";
import { configDir, hostsFile } from "../../src/config/paths.js";

let dir = "";
let env: NodeJS.ProcessEnv = {};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bb-config-"));
  env = { BB_CONFIG_DIR: dir };
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("config paths", () => {
  it("prefers BB_CONFIG_DIR", () => {
    expect(configDir({ BB_CONFIG_DIR: "/custom" })).toBe("/custom");
  });

  it("falls back to XDG_CONFIG_HOME", () => {
    expect(configDir({ XDG_CONFIG_HOME: "/xdg" })).toBe(join("/xdg", "bb"));
  });
});

describe("credential storage", () => {
  it("round-trips a credential", async () => {
    await writeCredential({ kind: "api-token", token: "t", email: "a@b.com" }, undefined, env);
    expect(await readCredential(undefined, env)).toMatchObject({
      kind: "api-token",
      token: "t",
      email: "a@b.com",
    });
  });

  it("writes the file at mode 0600", async () => {
    await writeCredential({ kind: "api-token", token: "t" }, undefined, env);
    // 0600 keeps the token out of a screenshare and out of a dotfile sync. It does not
    // defend against a local attacker, and we do not claim it does.
    expect(statSync(hostsFile(env)).mode & 0o777).toBe(0o600);
  });

  it("returns undefined when nothing is stored", async () => {
    expect(await readCredential(undefined, env)).toBeUndefined();
  });

  it("reports whether a delete actually removed anything", async () => {
    expect(await deleteCredential(undefined, env)).toBe(false);
    await writeCredential({ kind: "api-token", token: "t" }, undefined, env);
    expect(await deleteCredential(undefined, env)).toBe(true);
    expect(await readCredential(undefined, env)).toBeUndefined();
  });

  it("keeps credentials for other hosts when one is removed", async () => {
    await writeCredential({ kind: "api-token", token: "a" }, "bitbucket.org", env);
    await writeCredential({ kind: "access-token", token: "b" }, "bb.internal", env);
    await deleteCredential("bitbucket.org", env);
    expect(await readCredential("bb.internal", env)).toMatchObject({ token: "b" });
  });
});
