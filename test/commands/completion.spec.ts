import { describe, expect, it } from "vitest";

import { generateCompletion, SHELLS } from "../../src/commands/completion/generate.js";
import { buildCommandTree } from "../../src/commands/completion/tree.js";
import { rootCommand } from "../../src/commands/index.js";
import { runCli } from "../helpers/run-cli.js";

const tree = await buildCommandTree(rootCommand, "bb");

describe("buildCommandTree", () => {
  it("walks the real command tree", () => {
    const names = tree.children.map((child) => child.name);
    expect(names).toContain("pr");
    expect(names).toContain("pipeline");
  });

  it("resolves lazy subcommands one level deeper", () => {
    const pr = tree.children.find((child) => child.name === "pr");
    expect(pr?.children.map((child) => child.name)).toEqual(
      expect.arrayContaining(["list", "view", "merge", "checkout"]),
    );
  });

  it("omits hidden commands", () => {
    const auth = tree.children.find((child) => child.name === "auth");
    // `git-credential` exists for git to invoke, not for a person to complete.
    expect(auth?.children.map((child) => child.name)).not.toContain("git-credential");
  });

  it("collects flags but not positionals", () => {
    const merge = tree.children
      .find((child) => child.name === "pr")
      ?.children.find((child) => child.name === "merge");
    expect(merge?.flags).toContain("squash");
    expect(merge?.flags).not.toContain("id");
  });
});

describe("generateCompletion", () => {
  for (const shell of SHELLS) {
    it(`produces a non-empty ${shell} script mentioning bb`, () => {
      const script = generateCompletion(shell, tree);
      expect(script.length).toBeGreaterThan(100);
      expect(script).toContain("bb");
    });
  }

  it("does not call mapfile, which is bash 4+ while macOS ships 3.2", () => {
    // The name still appears in a comment explaining the choice, so match the call.
    expect(generateCompletion("bash", tree)).not.toMatch(/^\s*mapfile\s/m);
    expect(generateCompletion("bash", tree)).toContain("COMPREPLY=( $(compgen");
  });

  it("only extends the path along real subcommands", () => {
    // This is what stops `--limit 5` from making `5` look like a subcommand and
    // stranding every completion after it.
    expect(generateCompletion("bash", tree)).toContain("_bb_is_path");
    expect(generateCompletion("zsh", tree)).toContain("_bb_is_path");
  });

  it("strips single quotes that would break the surrounding quoting", () => {
    const script = generateCompletion("fish", {
      name: "bb",
      description: "",
      flags: [],
      children: [{ name: "x", description: "don't break", flags: [], children: [] }],
    });
    expect(script).toContain("dont break");
  });
});

describe("bb completion", () => {
  it("names the valid shells when given none", async () => {
    const result = await runCli(["completion"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(/bash, zsh, fish, powershell/);
  });

  it("rejects an unknown shell", async () => {
    const result = await runCli(["completion", "-s", "tcsh"]);
    expect(result.exitCode).toBe(2);
  });

  it("writes the script to stdout", async () => {
    const result = await runCli(["completion", "-s", "bash"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("complete -F _bb_completion bb");
  });
});
