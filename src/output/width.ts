/**
 * Display width of a string in terminal cells.
 *
 * Hand-rolled to stay dependency-free. Strips ANSI SGR sequences and OSC 8 hyperlinks,
 * counts East Asian wide characters and emoji as two cells, and combining marks as
 * zero. It will be a cell off on some rare grapheme clusters — ZWJ family emoji, flag
 * sequences — which is acceptable for aligning pull-request titles in a column.
 */

// Built from char codes rather than literal control bytes, which are invisible in a
// diff and easy to mangle.
const ESC = String.fromCharCode(27);
const BEL = String.fromCharCode(7);

/** CSI sequences: colours and cursor moves. */
const ANSI = new RegExp(`${ESC}\\[[0-9;?]*[A-Za-z]`, "g");
/** OSC 8 hyperlink wrappers, terminated by BEL or ST. */
const OSC8 = new RegExp(`${ESC}\\]8;;.*?(?:${BEL}|${ESC}\\\\)`, "g");

export const stripAnsi = (value: string): string => value.replace(OSC8, "").replace(ANSI, "");

const isZeroWidth = (code: number): boolean =>
  // Combining marks, zero-width joiner/non-joiner, variation selectors.
  (code >= 0x0300 && code <= 0x036f) ||
  code === 0x200b ||
  code === 0x200c ||
  code === 0x200d ||
  (code >= 0xfe00 && code <= 0xfe0f);

const isWide = (code: number): boolean =>
  (code >= 0x1100 && code <= 0x115f) || // Hangul Jamo
  (code >= 0x2e80 && code <= 0xa4cf) || // CJK radicals through Yi
  (code >= 0xac00 && code <= 0xd7a3) || // Hangul syllables
  (code >= 0xf900 && code <= 0xfaff) || // CJK compatibility ideographs
  (code >= 0xfe30 && code <= 0xfe6f) || // CJK compatibility forms
  (code >= 0xff00 && code <= 0xff60) || // Fullwidth forms
  (code >= 0xffe0 && code <= 0xffe6) ||
  (code >= 0x1f300 && code <= 0x1f64f) || // Emoji
  (code >= 0x1f900 && code <= 0x1f9ff);

const cellWidth = (code: number): number => (isZeroWidth(code) ? 0 : isWide(code) ? 2 : 1);

export const displayWidth = (value: string): number => {
  let width = 0;
  for (const char of stripAnsi(value)) {
    width += cellWidth(char.codePointAt(0) ?? 0);
  }
  return width;
};

/** Truncates to `max` display cells, appending an ellipsis when it had to cut. */
export const truncate = (value: string, max: number): string => {
  if (max <= 0) {
    return "";
  }
  const plain = stripAnsi(value);
  if (displayWidth(plain) <= max) {
    return value;
  }
  let width = 0;
  let result = "";
  for (const char of plain) {
    const charWidth = cellWidth(char.codePointAt(0) ?? 0);
    if (width + charWidth > max - 1) {
      break;
    }
    result += char;
    width += charWidth;
  }
  return `${result}…`;
};

export const padEnd = (value: string, width: number): string =>
  value + " ".repeat(Math.max(0, width - displayWidth(value)));
