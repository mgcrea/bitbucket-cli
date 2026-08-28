import { describe, expect, it } from "vitest";

import { AliasError, expandAlias, tokenize } from "../../src/alias/expand.js";
import { rootCommand } from "../../src/commands/index.js";
import { RESERVED_NAMES } from "../../src/commands/reserved.js";

const reserved = RESERVED_NAMES;
const expand = (argv: string[], aliases: Record<string, string>) =>
  expandAlias(argv, { aliases, reserved });

describe("tokenize", () => {
  it("splits on whitespace", () => {
    expect(tokenize("pr list --state open")).toEqual(["pr", "list", "--state", "open"]);
  });

  it("keeps a quoted argument whole", () => {
    expect(tokenize(`pr list --search "two words"`)).toEqual([
      "pr",
      "list",
      "--search",
      "two words",
    ]);
  });

  it("preserves an empty quoted argument", () => {
    expect(tokenize(`api /x -f ""`)).toEqual(["api", "/x", "-f", ""]);
  });

  it("handles single quotes containing a double quote", () => {
    expect(tokenize(`--jq '.[] | select(.a=="b")'`)).toEqual(["--jq", '.[] | select(.a=="b")']);
  });
});

describe("expandAlias", () => {
  it("leaves a non-alias alone", () => {
    expect(expand(["pr", "list"], { prs: "pr list" })).toEqual({ kind: "none" });
  });

  it("expands and appends the remaining arguments", () => {
    expect(expand(["prs", "--limit", "5"], { prs: "pr list" })).toEqual({
      kind: "args",
      argv: ["pr", "list", "--limit", "5"],
    });
  });

  it("never lets an alias shadow a built-in", () => {
    // A built-in must always win, even if config somehow contains such an alias.
    expect(expand(["pr", "x"], { pr: "repo list" })).toEqual({ kind: "none" });
  });

  it("consumes arguments when placeholders are used", () => {
    expect(expand(["v", "42"], { v: "pr view $1 --json url" })).toEqual({
      kind: "args",
      argv: ["pr", "view", "42", "--json", "url"],
    });
  });

  it("expands $@ to every remaining argument", () => {
    expect(expand(["a", "x", "y"], { a: "pr list $@" })).toEqual({
      kind: "args",
      argv: ["pr", "list", "x", "y"],
    });
  });

  it("returns a shell expansion for a ! alias", () => {
    expect(expand(["bugs", "x"], { bugs: "!echo hi" })).toEqual({
      kind: "shell",
      command: "echo hi",
      args: ["x"],
    });
  });

  it("follows a chain of aliases", () => {
    expect(expand(["a"], { a: "b --x", b: "pr list" })).toEqual({
      kind: "args",
      argv: ["pr", "list", "--x"],
    });
  });

  it("fails loudly on a cycle rather than hanging", () => {
    expect(() => expand(["a"], { a: "b", b: "a" })).toThrow(AliasError);
  });

  it("rejects an empty shell alias", () => {
    expect(() => expand(["a"], { a: "!" })).toThrow(/empty command/);
  });
});

describe("RESERVED_NAMES", () => {
  it("matches the real top-level commands", async () => {
    // The list is hand-maintained to keep startup lazy, so this keeps it honest.
    const subCommands = (await (typeof rootCommand.subCommands === "function"
      ? rootCommand.subCommands()
      : rootCommand.subCommands)) as Record<string, unknown>;
    expect(RESERVED_NAMES.toSorted()).toEqual(Object.keys(subCommands).toSorted());
  });
});
