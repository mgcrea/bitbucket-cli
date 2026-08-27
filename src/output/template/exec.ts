import type { Colorize } from "../color.js";
import { asString, FUNCS, isTruthy, type TemplateContext } from "./funcs.js";
import { type Expression, type Node, parse } from "./parse.js";

type Scope = {
  dot: unknown;
  root: unknown;
  variables: Map<string, unknown>;
};

const resolvePath = (target: unknown, path: readonly string[]): unknown => {
  let current = target;
  for (const segment of path) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
};

const evaluate = (expression: Expression, scope: Scope, context: TemplateContext): unknown => {
  switch (expression.kind) {
    case "literal":
      return expression.value;
    case "variable":
      return scope.variables.get(expression.name);
    case "field":
      return resolvePath(expression.root === "dollar" ? scope.root : scope.dot, expression.path);
    case "call": {
      const func = FUNCS[expression.name];
      if (func === undefined) {
        throw new SyntaxError(
          `Unknown template function ${JSON.stringify(expression.name)}. ` +
            `Available: ${Object.keys(FUNCS).toSorted().join(", ")}`,
        );
      }
      return func(context, ...expression.args.map((arg) => evaluate(arg, scope, context)));
    }
    case "pipe": {
      // Go pipes the previous stage's value in as the LAST argument.
      let value: unknown;
      for (const [index, stage] of expression.stages.entries()) {
        if (index === 0) {
          value = evaluate(stage, scope, context);
          continue;
        }
        if (stage.kind === "call") {
          const func = FUNCS[stage.name];
          if (func === undefined) {
            throw new SyntaxError(`Unknown template function ${JSON.stringify(stage.name)}`);
          }
          const args = stage.args.map((arg) => evaluate(arg, scope, context));
          value = func(context, ...args, value);
          continue;
        }
        value = evaluate(stage, scope, context);
      }
      return value;
    }
  }
};

const iterate = (value: unknown): [unknown, unknown][] => {
  if (Array.isArray(value)) {
    return value.map((item, index) => [index, item]);
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value);
  }
  return [];
};

const render = (nodes: readonly Node[], scope: Scope, context: TemplateContext): string => {
  let output = "";
  for (const node of nodes) {
    switch (node.kind) {
      case "text":
        output += node.value;
        break;
      case "output":
        output += asString(evaluate(node.expression, scope, context));
        break;
      case "assign":
        scope.variables.set(node.name, evaluate(node.expression, scope, context));
        break;
      case "if": {
        const condition = evaluate(node.condition, scope, context);
        output += render(isTruthy(condition) ? node.consequent : node.alternate, scope, context);
        break;
      }
      case "with": {
        const value = evaluate(node.expression, scope, context);
        output += isTruthy(value)
          ? render(node.body, { ...scope, dot: value }, context)
          : render(node.alternate, scope, context);
        break;
      }
      case "range": {
        const value = evaluate(node.expression, scope, context);
        const entries = iterate(value);
        if (entries.length === 0) {
          output += render(node.alternate, scope, context);
          break;
        }
        for (const [, item] of entries) {
          output += render(node.body, { ...scope, dot: item }, context);
        }
        break;
      }
    }
  }
  return output;
};

export type RenderTemplateOptions = {
  style: Colorize;
  hyperlinks?: boolean | undefined;
};

export const renderTemplate = (
  source: string,
  data: unknown,
  options: RenderTemplateOptions,
): string => {
  const context: TemplateContext = {
    style: options.style,
    hyperlinks: options.hyperlinks ?? false,
    tableRows: [],
  };
  const scope: Scope = { dot: data, root: data, variables: new Map() };
  const output = render(parse(source), scope, context);

  // A template that buffered rows but never called tablerender still gets its table,
  // rather than silently dropping every row.
  const pending = context.tableRows.length > 0 ? String(FUNCS["tablerender"]?.(context)) : "";
  return output + pending;
};
