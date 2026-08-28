export type AliasExpansion =
  | { kind: "none" }
  | { kind: "args"; argv: string[] }
  /** A `!`-prefixed alias runs through the shell rather than through bb. */
  | { kind: "shell"; command: string; args: string[] };

export class AliasError extends Error {
  override readonly name = "AliasError";
}

/** Splits on whitespace, honouring single and double quotes. */
export const tokenize = (input: string): string[] => {
  const tokens: string[] = [];
  let current = "";
  let quote: string | undefined;
  let started = false;

  for (const char of input) {
    if (quote !== undefined) {
      if (char === quote) {
        quote = undefined;
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      started = true;
      continue;
    }
    if (/\s/.test(char)) {
      if (started || current !== "") {
        tokens.push(current);
        current = "";
        started = false;
      }
      continue;
    }
    current += char;
  }
  if (started || current !== "") {
    tokens.push(current);
  }
  return tokens;
};

/**
 * Substitutes `$1`…`$9` and `$@`, reporting whether any were used.
 *
 * An alias that uses placeholders consumes those arguments; one that does not gets the
 * remaining argv appended, which is what makes `bb prs --limit 5` work for an alias
 * defined as `pr list`.
 */
const substitute = (
  tokens: readonly string[],
  args: readonly string[],
): { tokens: string[]; usedPlaceholders: boolean } => {
  let usedPlaceholders = false;
  const expanded: string[] = [];

  for (const token of tokens) {
    if (token === "$@") {
      usedPlaceholders = true;
      expanded.push(...args);
      continue;
    }
    const replaced = token.replace(/\$([1-9])/g, (_match, digit: string) => {
      usedPlaceholders = true;
      return args[Number(digit) - 1] ?? "";
    });
    expanded.push(replaced);
  }
  return { tokens: expanded, usedPlaceholders };
};

export type ExpandOptions = {
  aliases: Readonly<Record<string, string>>;
  /** Names that can never be aliased, so a built-in always wins. */
  reserved: readonly string[];
  maxDepth?: number | undefined;
};

/**
 * Expands the leading argument if it names an alias.
 *
 * A built-in always wins, so an alias can never shadow `bb pr`. Expansion repeats for
 * chained aliases, bounded by a depth limit and a seen-set so a cycle fails loudly
 * rather than hanging.
 */
export const expandAlias = (argv: readonly string[], options: ExpandOptions): AliasExpansion => {
  const maxDepth = options.maxDepth ?? 10;
  let current = [...argv];
  const seen = new Set<string>();

  for (let depth = 0; depth < maxDepth; depth += 1) {
    const head = current[0];
    if (head === undefined || options.reserved.includes(head)) {
      return depth === 0 ? { kind: "none" } : { kind: "args", argv: current };
    }

    const body = options.aliases[head];
    if (body === undefined) {
      return depth === 0 ? { kind: "none" } : { kind: "args", argv: current };
    }
    if (seen.has(head)) {
      throw new AliasError(`Alias ${JSON.stringify(head)} expands to itself`);
    }
    seen.add(head);

    const rest = current.slice(1);

    if (body.startsWith("!")) {
      const command = body.slice(1).trim();
      if (command === "") {
        throw new AliasError(`Shell alias ${JSON.stringify(head)} has an empty command`);
      }
      return { kind: "shell", command, args: rest };
    }

    const { tokens, usedPlaceholders } = substitute(tokenize(body), rest);
    current = usedPlaceholders ? tokens : [...tokens, ...rest];
  }

  throw new AliasError(`Alias expansion exceeded ${maxDepth} levels`);
};
