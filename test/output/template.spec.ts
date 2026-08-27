import { describe, expect, it } from "vitest";

import { createColorizer } from "../../src/output/color.js";
import { renderTemplate } from "../../src/output/template/index.js";

const plain = { style: createColorizer(false) };
const render = (source: string, data: unknown): string => renderTemplate(source, data, plain);

const prs = [
  { id: 7, title: "Add OAuth support", state: "OPEN", updated_on: "2026-08-01T00:00:00Z" },
  { id: 12, title: "Fix pagination", state: "MERGED", updated_on: "2026-08-20T00:00:00Z" },
];

describe("template basics", () => {
  it("renders literal text unchanged", () => {
    expect(render("hello", {})).toBe("hello");
  });

  it("resolves a field path", () => {
    expect(render("{{.a.b}}", { a: { b: "deep" } })).toBe("deep");
  });

  it("resolves the root with $ inside a range", () => {
    expect(
      render("{{range .items}}{{$.prefix}}{{.}} {{end}}", { prefix: ">", items: [1, 2] }),
    ).toBe(">1 >2 ");
  });

  it("supports variables", () => {
    expect(render("{{$x := .title}}{{$x}}", { title: "hi" })).toBe("hi");
  });
});

describe("control flow", () => {
  it("renders if/else", () => {
    expect(render("{{if .ok}}yes{{else}}no{{end}}", { ok: true })).toBe("yes");
    expect(render("{{if .ok}}yes{{else}}no{{end}}", { ok: false })).toBe("no");
  });

  it("treats empty collections as false, like Go", () => {
    expect(render("{{if .list}}some{{else}}none{{end}}", { list: [] })).toBe("none");
  });

  it("renders range with an else branch for the empty case", () => {
    expect(render("{{range .}}{{.}}{{else}}empty{{end}}", [])).toBe("empty");
    expect(render("{{range .}}{{.}},{{end}}", [1, 2, 3])).toBe("1,2,3,");
  });

  it("renders with, rebinding dot", () => {
    expect(render("{{with .user}}{{.name}}{{end}}", { user: { name: "Ada" } })).toBe("Ada");
  });

  it("honours whitespace trim markers", () => {
    expect(render("{{range .}}\n  {{- .}}\n{{end}}", [1, 2])).toBe("1\n2\n");
  });
});

describe("pipelines and helpers", () => {
  it("pipes the previous value in as the last argument", () => {
    expect(render("{{.title | truncate 6}}", { title: "abcdefghij" })).toBe("abcde…");
  });

  it("chains several pipe stages", () => {
    expect(render('{{.name | printf "<%s>" | truncate 4}}', { name: "abc" })).toBe("<ab…");
  });

  it("supports parenthesised calls as arguments", () => {
    expect(render('{{printf "%s!" (.a)}}', { a: "hi" })).toBe("hi!");
  });

  it("implements the comparison and boolean builtins", () => {
    expect(render("{{if eq .a 1}}y{{end}}", { a: 1 })).toBe("y");
    expect(render("{{if and .a .b}}y{{else}}n{{end}}", { a: true, b: false })).toBe("n");
    expect(render("{{if not .a}}y{{end}}", { a: false })).toBe("y");
  });

  it("implements join, pluck and len", () => {
    expect(render('{{.list | join ", "}}', { list: ["a", "b"] })).toBe("a, b");
    expect(render('{{.rows | pluck "id" | join "-"}}', { rows: [{ id: 1 }, { id: 2 }] })).toBe(
      "1-2",
    );
    expect(render("{{len .list}}", { list: [1, 2, 3] })).toBe("3");
  });

  it("formats a Go reference-time layout", () => {
    expect(render('{{timefmt "2006-01-02" .d}}', { d: "2026-08-27T10:30:00Z" })).toMatch(
      /^2026-08-2[67]$/,
    );
  });

  it("errors helpfully on an unknown function", () => {
    expect(() => render("{{bogus .a}}", {})).toThrow(/Unknown template function "bogus"/);
  });
});

describe("tablerow and tablerender", () => {
  it("buffers rows, then aligns every column on render", () => {
    // The point of the pair: column widths are not known until every row is in.
    const out = render("{{range .}}{{tablerow .id .title .state}}{{end}}{{tablerender}}", prs);
    expect(out).toBe("7   Add OAuth support  OPEN\n12  Fix pagination     MERGED\n");
  });

  it("still emits buffered rows when the template forgets tablerender", () => {
    const out = render("{{range .}}{{tablerow .id .title}}{{end}}", prs);
    expect(out).toContain("7   Add OAuth support");
  });
});

describe("colour safety", () => {
  it("emits no escape codes when colour is disabled", () => {
    const out = render('{{color "red" .title}}', { title: "x" });
    expect(out).toBe("x");
    expect(out).not.toContain(String.fromCharCode(27));
  });

  it("emits escape codes when colour is enabled", () => {
    const out = renderTemplate('{{color "red" .t}}', { t: "x" }, { style: createColorizer(true) });
    expect(out).toContain(String.fromCharCode(27));
  });

  it("emits a plain label when hyperlinks are unsupported", () => {
    expect(render("{{hyperlink .url .text}}", { url: "https://x", text: "link" })).toBe("link");
  });
});
