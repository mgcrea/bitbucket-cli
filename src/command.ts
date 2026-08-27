import { type ArgsDef, type CommandDef, defineCommand } from "citty";

import { reportError } from "./errors.js";
import { availableFields, type FieldMap } from "./output/fields.js";
import { type OutputOptions, type Result, renderResult } from "./output/result.js";
import { getRuntime } from "./runtime.js";

/**
 * Flags every command accepts. Declared once so help, parsing and behaviour cannot
 * drift between commands.
 */
export const GLOBAL_ARGS = {
  json: {
    type: "string",
    description: "Output JSON. Pass a comma-separated field list, or nothing to see the fields",
  },
  jq: { type: "string", description: "Filter JSON output with a jq expression" },
  template: { type: "string", description: "Format JSON output with a Go template" },
  repo: {
    type: "string",
    alias: "R",
    valueHint: "workspace/repo",
    description: "Select a repository",
  },
  workspace: {
    type: "string",
    alias: "W",
    valueHint: "workspace",
    description: "Select a workspace",
  },
} as const satisfies ArgsDef;

export type BbArgs = Record<string, unknown>;

export type BbCommandDef<T> = Omit<CommandDef, "run" | "args"> & {
  args?: ArgsDef | undefined;
  /** Fields surfaced by bare `--json`, and the source of the server-side projection. */
  fields?: FieldMap<T> | undefined;
  examples?: readonly string[] | undefined;
  run: (context: { args: BbArgs }) => Promise<Result<T>> | Result<T>;
};

/**
 * Wraps a command so it never prints and never throws past us.
 *
 * citty's own `runMain` catches errors and prints the whole error object before
 * exiting, which would bypass our formatting and exit-code mapping — so nothing is
 * allowed to reach it.
 */
export const defineBbCommand = <T>(definition: BbCommandDef<T>): CommandDef => {
  const { fields, examples: _examples, run, args, ...rest } = definition;

  // Widened to ArgsDef so citty does not infer a narrow literal type per command,
  // which would make every command's CommandDef mutually incompatible.
  return defineCommand<ArgsDef>({
    ...rest,
    args: { ...GLOBAL_ARGS, ...args } as ArgsDef,
    run: async (context) => {
      const runtime = getRuntime();
      try {
        const commandArgs = context.args as BbArgs;
        const output: OutputOptions = {
          json: commandArgs["json"] as string | undefined,
          jq: commandArgs["jq"] as string | undefined,
          template: commandArgs["template"] as string | undefined,
        };
        // Bare `--json` lists the available fields. That is pure metadata, so it must
        // answer without resolving a repository, reading a credential, or making a
        // request — `bb pr list --json` has to work from anywhere.
        if (output.json === "" && fields !== undefined) {
          for (const field of availableFields(fields)) {
            runtime.io.out(field);
          }
          return;
        }

        const result = await run({ args: commandArgs });
        await renderResult(result, output, fields, runtime.io);
      } catch (error) {
        reportError(error, runtime.io);
      }
    },
  });
};
