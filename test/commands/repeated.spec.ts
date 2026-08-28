import { describe, expect, it } from "vitest";

import { collectRepeated } from "../../src/bin/repeated.js";

describe("collectRepeated", () => {
  it("collects every occurrence, not just the last", () => {
    // The whole point: citty's parsed args keep only the final value.
    expect(collectRepeated(["-f", "a=1", "-f", "b=2"], ["f", "raw-field"])).toEqual(["a=1", "b=2"]);
  });

  it("accepts the long form and the = form", () => {
    expect(collectRepeated(["--raw-field", "a=1", "--raw-field=b=2"], ["f", "raw-field"])).toEqual([
      "a=1",
      "b=2",
    ]);
  });

  it("accepts an attached short value", () => {
    expect(collectRepeated(["-fa=1"], ["f", "raw-field"])).toEqual(["a=1"]);
  });

  it("keeps a value containing an equals sign intact", () => {
    expect(collectRepeated(['--raw-field=q=state="OPEN"'], ["raw-field"])).toEqual([
      'q=state="OPEN"',
    ]);
  });

  it("ignores unrelated flags, including ones sharing a prefix", () => {
    expect(collectRepeated(["--fields", "x", "-f", "a=1"], ["f", "raw-field"])).toEqual(["a=1"]);
  });

  it("returns nothing when the flag is absent", () => {
    expect(collectRepeated(["pr", "list"], ["f", "raw-field"])).toEqual([]);
  });

  it("does not consume a missing trailing value", () => {
    expect(collectRepeated(["-f"], ["f"])).toEqual([]);
  });
});
