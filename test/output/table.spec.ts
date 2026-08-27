import { describe, expect, it } from "vitest";

import { createFakeIo } from "../../src/output/io.js";
import { type Column, renderTable } from "../../src/output/table.js";

type Row = { id: number; title: string; state: string };

const columns: Column<Row>[] = [
  { header: "ID", value: (row) => String(row.id) },
  { header: "TITLE", value: (row) => row.title, flex: true, minWidth: 10 },
  { header: "STATE", value: (row) => row.state },
];

const rows: Row[] = [
  { id: 7, title: "Add OAuth support", state: "OPEN" },
  { id: 12, title: "Fix pagination", state: "MERGED" },
];

describe("renderTable", () => {
  it("emits TSV with no header when stdout is piped", () => {
    const io = createFakeIo({ isTTY: false });
    renderTable(rows, columns, io);
    // The contract that makes `bb pr list | awk -F'\t'` work.
    expect(io.stdout).toBe("7\tAdd OAuth support\tOPEN\n12\tFix pagination\tMERGED\n");
  });

  it("emits a padded table with a header on a terminal", () => {
    const io = createFakeIo({ isTTY: true, width: 80 });
    renderTable(rows, columns, io);
    const lines = io.stdout.trimEnd().split("\n");
    expect(lines[0]).toBe("ID  TITLE              STATE");
    expect(lines[1]).toBe("7   Add OAuth support  OPEN");
  });

  it("truncates the flexible column to fit a narrow terminal", () => {
    // Natural width is 29 cells, so 24 forces the flexible TITLE column to give up 5.
    const io = createFakeIo({ isTTY: true, width: 24 });
    renderTable(rows, columns, io);
    for (const line of io.stdout.trimEnd().split("\n")) {
      expect(line.length).toBeLessThanOrEqual(24);
    }
    expect(io.stdout).toContain("…");
  });

  it("never shrinks a flexible column below its declared minimum", () => {
    const io = createFakeIo({ isTTY: true, width: 5 });
    renderTable(rows, columns, io);
    // minWidth 10 on TITLE holds even when the terminal cannot accommodate it, so the
    // column stays readable rather than collapsing to an ellipsis.
    expect(io.stdout).toContain("Add OAuth…");
  });

  it("neutralises tabs inside cells so the separator stays unambiguous", () => {
    const io = createFakeIo({ isTTY: false });
    renderTable([{ id: 1, title: "a\tb\nc", state: "OPEN" }], columns, io);
    expect(io.stdout).toBe("1\ta b c\tOPEN\n");
  });

  it("prints nothing at all for an empty result", () => {
    const io = createFakeIo({ isTTY: true });
    renderTable([], columns, io);
    expect(io.stdout).toBe("");
  });
});
