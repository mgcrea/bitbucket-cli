import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const BIN = resolve(import.meta.dirname, "../../dist/bin/cli.cjs");

/**
 * Runs the built artifact as a real subprocess.
 *
 * This suite exists to catch shebang breakage, CJS/ESM interop and bundler-rewritten
 * dynamic imports — the bug class unit tests structurally cannot see, because they run
 * the TypeScript sources through vitest rather than the bundle that actually ships.
 *
 * Gated on the artifact existing so `pnpm spec` still works before a build.
 */
const run = async (
  args: string[],
  options: { input?: string; env?: Record<string, string> } = {},
): Promise<{ stdout: string; stderr: string; code: number }> => {
  try {
    const child = execFileAsync("node", [BIN, ...args], {
      env: { ...process.env, NO_COLOR: "1", ...options.env },
    });
    if (options.input !== undefined) {
      child.child.stdin?.end(options.input);
    }
    const { stdout, stderr } = await child;
    return { stdout, stderr, code: 0 };
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string; code?: number };
    return { stdout: failure.stdout ?? "", stderr: failure.stderr ?? "", code: failure.code ?? 1 };
  }
};

describe.skipIf(!existsSync(BIN))("bb binary", () => {
  it("prints its version", async () => {
    const result = await run(["--version"]);
    expect(result.code).toBe(0);
    // Substituted at build time, so this also proves the define reached the bundle.
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("prints help and exits cleanly", async () => {
    const result = await run(["--help"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Work with Bitbucket");
  });

  it("lists the available --json fields without needing a repo or a credential", async () => {
    const result = await run(["pr", "list", "--json"], { env: { BB_REPO: "" } });
    expect(result.code).toBe(0);
    expect(result.stdout.split("\n")).toContain("title");
  });

  it("refuses `issue` with an explanation and a distinct exit code", async () => {
    const result = await run(["issue", "list"]);
    expect(result.code).toBe(10);
    expect(result.stderr).toContain("removed the issue tracker API");
    // Nothing on stdout: a failing command must leave a pipe clean.
    expect(result.stdout).toBe("");
  });

  it("reports a missing repository as a usage error, on stderr only", async () => {
    const result = await run(["pr", "list"], { env: { BB_REPO: "", BB_TOKEN: "x" } });
    expect(result.code).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("--repo");
  });

  it("loads jq-wasm from inside the bundled CJS artifact", async () => {
    // The load-bearing check: jq-wasm resolves its .wasm relative to its own package
    // directory, which only works because the dynamic import survives bundling.
    const result = await run(["api", "--help"]);
    expect(result.code).toBe(0);
  });
});
