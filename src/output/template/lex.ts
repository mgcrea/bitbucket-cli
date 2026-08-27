export type Token =
  | { kind: "text"; value: string }
  | { kind: "action"; value: string; trimLeft: boolean; trimRight: boolean };

/**
 * Splits a template into literal text and `{{ ... }}` actions.
 *
 * Handles Go's whitespace trim markers: `{{-` eats preceding whitespace and `-}}` eats
 * following whitespace, which is what keeps `range` loops from emitting blank lines.
 */
export const lex = (source: string): Token[] => {
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    const open = source.indexOf("{{", index);
    if (open === -1) {
      tokens.push({ kind: "text", value: source.slice(index) });
      break;
    }
    if (open > index) {
      tokens.push({ kind: "text", value: source.slice(index, open) });
    }

    const close = source.indexOf("}}", open + 2);
    if (close === -1) {
      throw new SyntaxError(`Unclosed action at offset ${open}`);
    }

    let body = source.slice(open + 2, close);
    const trimLeft = body.startsWith("-") && /^-\s/.test(body);
    const trimRight = body.endsWith("-") && /\s-$/.test(body);
    if (trimLeft) body = body.slice(1);
    if (trimRight) body = body.slice(0, -1);

    tokens.push({ kind: "action", value: body.trim(), trimLeft, trimRight });
    index = close + 2;
  }

  // Apply the trim markers to the neighbouring text tokens.
  for (const [position, token] of tokens.entries()) {
    if (token.kind !== "action") {
      continue;
    }
    if (token.trimLeft) {
      const previous = tokens[position - 1];
      if (previous?.kind === "text") {
        previous.value = previous.value.replace(/\s+$/, "");
      }
    }
    if (token.trimRight) {
      const next = tokens[position + 1];
      if (next?.kind === "text") {
        next.value = next.value.replace(/^\s+/, "");
      }
    }
  }

  return tokens;
};
