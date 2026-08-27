import { describe, expect, it } from "vitest";

import { prepareArgv } from "../../src/bin/argv.js";

describe("prepareArgv", () => {
  it("passes ordinary arguments through untouched", () => {
    expect(prepareArgv(["pr", "list", "--limit", "5"]).argv).toEqual([
      "pr",
      "list",
      "--limit",
      "5",
    ]);
  });

  it("splits everything after the first -- into passthrough", () => {
    // citty would otherwise flatten these into `_` with no boundary.
    const prepared = prepareArgv(["pr", "checkout", "42", "--", "--force", "-b", "x"]);
    expect(prepared.argv).toEqual(["pr", "checkout", "42"]);
    expect(prepared.passthrough).toEqual(["--force", "-b", "x"]);
  });

  it("only splits on the first --", () => {
    expect(prepareArgv(["a", "--", "b", "--", "c"]).passthrough).toEqual(["b", "--", "c"]);
  });

  it("rewrites a trailing bare --json to the field-listing sentinel", () => {
    expect(prepareArgv(["pr", "list", "--json"]).argv).toEqual(["pr", "list", "--json="]);
  });

  it("rewrites a bare --json followed by another flag", () => {
    // Without this, `json` would parse as the string "--limit".
    expect(prepareArgv(["pr", "list", "--json", "--limit", "5"]).argv).toEqual([
      "pr",
      "list",
      "--json=",
      "--limit",
      "5",
    ]);
  });

  it("leaves --json alone when it has a real value", () => {
    expect(prepareArgv(["pr", "list", "--json", "id,title"]).argv).toEqual([
      "pr",
      "list",
      "--json",
      "id,title",
    ]);
  });

  it("does not rewrite --jq or --template, which require a value", () => {
    expect(prepareArgv(["pr", "list", "--jq"]).argv).toEqual(["pr", "list", "--jq"]);
  });
});
