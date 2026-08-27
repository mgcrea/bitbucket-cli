import { lex, type Token } from "./lex.js";

export type Expression =
  | { kind: "field"; path: string[]; root: "dot" | "dollar" }
  | { kind: "variable"; name: string }
  | { kind: "literal"; value: unknown }
  | { kind: "call"; name: string; args: Expression[] }
  | { kind: "pipe"; stages: Expression[] };

export type Node =
  | { kind: "text"; value: string }
  | { kind: "output"; expression: Expression }
  | { kind: "assign"; name: string; expression: Expression }
  | { kind: "if"; condition: Expression; consequent: Node[]; alternate: Node[] }
  | { kind: "range"; expression: Expression; body: Node[]; alternate: Node[] }
  | { kind: "with"; expression: Expression; body: Node[]; alternate: Node[] };

/** Splits an action body into top-level words, respecting quotes and parentheses. */
const tokenizeWords = (source: string): string[] => {
  const words: string[] = [];
  let current = "";
  let depth = 0;
  let quote: string | undefined;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index] ?? "";
    if (quote !== undefined) {
      current += char;
      if (char === "\\" && quote === '"') {
        current += source[index + 1] ?? "";
        index += 1;
      } else if (char === quote) {
        quote = undefined;
      }
      continue;
    }
    if (char === '"' || char === "`") {
      quote = char;
      current += char;
      continue;
    }
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (/\s/.test(char) && depth === 0) {
      if (current !== "") {
        words.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }
  if (current !== "") {
    words.push(current);
  }
  return words;
};

const parseLiteral = (word: string): unknown | undefined => {
  if (word.startsWith('"')) {
    return JSON.parse(word) as string;
  }
  if (word.startsWith("`")) {
    return word.slice(1, -1);
  }
  if (word === "true") return true;
  if (word === "false") return false;
  if (word === "nil") return null;
  if (/^-?\d+(\.\d+)?$/.test(word)) return Number(word);
  return undefined;
};

const parseTerm = (word: string): Expression => {
  if (word.startsWith("(") && word.endsWith(")")) {
    return parseExpression(word.slice(1, -1));
  }
  const literal = parseLiteral(word);
  if (literal !== undefined) {
    return { kind: "literal", value: literal };
  }
  // `$` and `$.a.b` address the root; `$name` is a variable. Check the root forms
  // first, or `$.a` parses as a variable unhelpfully named ".a".
  if (word === "$" || word.startsWith("$.")) {
    return {
      kind: "field",
      path: word
        .slice(1)
        .split(".")
        .filter((part) => part !== ""),
      root: "dollar",
    };
  }
  if (word.startsWith("$") && word.length > 1) {
    return { kind: "variable", name: word.slice(1) };
  }
  if (word === "." || word.startsWith(".")) {
    return {
      kind: "field",
      path: word
        .slice(1)
        .split(".")
        .filter((part) => part !== ""),
      root: "dot",
    };
  }
  // A bare word is a nullary function call, e.g. `tablerender`.
  return { kind: "call", name: word, args: [] };
};

export const parseExpression = (source: string): Expression => {
  const stages = source
    .split("|")
    .map((stage) => stage.trim())
    .filter((stage) => stage !== "");
  if (stages.length > 1) {
    return { kind: "pipe", stages: stages.map((stage) => parseSingle(stage)) };
  }
  return parseSingle(source.trim());
};

const parseSingle = (source: string): Expression => {
  const words = tokenizeWords(source);
  if (words.length === 0) {
    return { kind: "literal", value: "" };
  }
  const [head, ...rest] = words;
  if (head === undefined) {
    return { kind: "literal", value: "" };
  }
  if (rest.length === 0) {
    return parseTerm(head);
  }
  // A leading word with arguments is a function call.
  return { kind: "call", name: head, args: rest.map((word) => parseTerm(word)) };
};

export const parse = (source: string): Node[] => {
  const tokens = lex(source);
  let position = 0;

  const parseBlock = (terminators: readonly string[]): { nodes: Node[]; terminator: string } => {
    const nodes: Node[] = [];
    while (position < tokens.length) {
      const token = tokens[position] as Token;
      position += 1;

      if (token.kind === "text") {
        if (token.value !== "") {
          nodes.push({ kind: "text", value: token.value });
        }
        continue;
      }

      const body = token.value;
      const keyword = body.split(/\s+/)[0] ?? "";

      if (terminators.includes(keyword)) {
        return { nodes, terminator: body };
      }

      if (keyword === "if" || keyword === "with") {
        const condition = parseExpression(body.slice(keyword.length).trim());
        const branch = parseBlock(["else", "end"]);
        let otherwise: Node[] = [];
        if (branch.terminator.startsWith("else")) {
          const chained = branch.terminator.slice(4).trim();
          if (chained.startsWith("if")) {
            // `else if` is sugar for a nested if in the else branch.
            position -= 1;
            tokens[position] = {
              kind: "action",
              value: chained,
              trimLeft: false,
              trimRight: false,
            };
            otherwise = parseBlock(["end"]).nodes;
          } else {
            otherwise = parseBlock(["end"]).nodes;
          }
        }
        nodes.push(
          keyword === "if"
            ? { kind: "if", condition, consequent: branch.nodes, alternate: otherwise }
            : { kind: "with", expression: condition, body: branch.nodes, alternate: otherwise },
        );
        continue;
      }

      if (keyword === "range") {
        const expression = parseExpression(body.slice(5).trim());
        const branch = parseBlock(["else", "end"]);
        const otherwise = branch.terminator.startsWith("else") ? parseBlock(["end"]).nodes : [];
        nodes.push({ kind: "range", expression, body: branch.nodes, alternate: otherwise });
        continue;
      }

      const assignment = /^\$([A-Za-z_]\w*)\s*:?=\s*(.+)$/.exec(body);
      if (assignment?.[1] !== undefined && assignment[2] !== undefined) {
        nodes.push({
          kind: "assign",
          name: assignment[1],
          expression: parseExpression(assignment[2]),
        });
        continue;
      }

      nodes.push({ kind: "output", expression: parseExpression(body) });
    }
    return { nodes, terminator: "" };
  };

  return parseBlock([]).nodes;
};
