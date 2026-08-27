import { describe, expect, it } from "vitest";

import { displayWidth, stripAnsi, truncate } from "../../src/output/width.js";

const ESC = String.fromCharCode(27);

describe("displayWidth", () => {
  it("counts plain ASCII one cell per character", () => {
    expect(displayWidth("hello")).toBe(5);
  });

  it("ignores ANSI colour sequences", () => {
    expect(displayWidth(`${ESC}[31mred${ESC}[39m`)).toBe(3);
  });

  it("counts CJK characters as two cells", () => {
    expect(displayWidth("日本語")).toBe(6);
  });

  it("counts combining marks as zero", () => {
    expect(displayWidth("é")).toBe(1);
  });
});

describe("stripAnsi", () => {
  it("removes OSC 8 hyperlink wrappers", () => {
    const link = `${ESC}]8;;https://example.com${String.fromCharCode(7)}text${ESC}]8;;${String.fromCharCode(7)}`;
    expect(stripAnsi(link)).toBe("text");
  });
});

describe("truncate", () => {
  it("leaves a string that already fits", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("cuts and appends an ellipsis", () => {
    expect(truncate("hello world", 8)).toBe("hello w…");
  });

  it("accounts for wide characters when cutting", () => {
    expect(displayWidth(truncate("日本語テスト", 7))).toBeLessThanOrEqual(7);
  });
});
