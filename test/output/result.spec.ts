import { describe, expect, it } from "vitest";

import type { FieldMap } from "../../src/output/fields.js";
import { createFakeIo, type Io } from "../../src/output/io.js";
import { renderResult } from "../../src/output/result.js";

type Row = { id: number; title: string; secret: string };

const fields: FieldMap<Row> = {
  id: { api: ["id"], pick: (row) => row.id },
  title: { api: ["title"], pick: (row) => row.title },
};

const rows: Row[] = [
  { id: 1, title: "first", secret: "hidden" },
  { id: 2, title: "second", secret: "hidden" },
];

const result = {
  kind: "data" as const,
  data: rows,
  render: (data: Row[], io: Io) => {
    for (const row of data) io.out(`${row.id} ${row.title}`);
  },
};

describe("renderResult", () => {
  it("uses the human renderer when no output flag is given", async () => {
    const io = createFakeIo();
    await renderResult(result, {}, fields, io);
    expect(io.stdout).toBe("1 first\n2 second\n");
  });

  it("emits only the selected fields for --json", async () => {
    const io = createFakeIo();
    await renderResult(result, { json: "id" }, fields, io);
    expect(JSON.parse(io.stdout)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("never leaks a property that is not a declared field", async () => {
    const io = createFakeIo();
    await renderResult(result, { json: "id,title" }, fields, io);
    expect(io.stdout).not.toContain("hidden");
  });

  it("rejects an unknown field with a suggestion", async () => {
    const io = createFakeIo();
    await expect(renderResult(result, { json: "titel" }, fields, io)).rejects.toThrow(
      /Did you mean "title"/,
    );
  });

  it("lets --jq imply the full field set", async () => {
    const io = createFakeIo();
    await renderResult(result, { jq: ".[].title" }, fields, io);
    expect(io.stdout).toBe("first\nsecond\n");
  });

  it("renders a template without needing --json", async () => {
    const io = createFakeIo();
    await renderResult(result, { template: "{{range .}}{{.id}};{{end}}" }, fields, io);
    expect(io.stdout).toBe("1;2;\n");
  });

  it("passes text results through untouched", async () => {
    const io = createFakeIo();
    await renderResult({ kind: "text", text: "diff --git a b\n" }, { json: "id" }, fields, io);
    expect(io.stdout).toBe("diff --git a b\n");
  });
});
