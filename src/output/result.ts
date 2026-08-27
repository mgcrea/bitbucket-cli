import { availableFields, type FieldMap, parseFieldSelection, pickFields } from "./fields.js";
import type { Io } from "./io.js";
import { loadJq } from "./jq.js";
import { renderTemplate } from "./template/index.js";

/**
 * What a command returns.
 *
 * Commands never print. Returning data rather than writing it is what makes
 * `--json`/`--jq`/`--template`/table/TSV uniform across every command, and it is what
 * makes output snapshot-testable without a terminal.
 */
export type Result<T> =
  | { kind: "data"; data: T[]; render: (data: T[], io: Io) => void }
  | { kind: "text"; text: string }
  | { kind: "none" };

export type OutputOptions = {
  /** Empty string means "list the available fields and exit". */
  json?: string | undefined;
  jq?: string | undefined;
  template?: string | undefined;
};

export const renderResult = async <T>(
  result: Result<T>,
  options: OutputOptions,
  fields: FieldMap<T> | undefined,
  io: Io,
): Promise<void> => {
  if (result.kind === "none") {
    return;
  }

  // Diffs, patches and logs bypass the formatting layer entirely.
  if (result.kind === "text") {
    if (result.text !== "") {
      io.out(result.text.replace(/\n$/, ""));
    }
    return;
  }

  const wantsStructured =
    options.json !== undefined || options.jq !== undefined || options.template !== undefined;

  if (!wantsStructured) {
    result.render(result.data, io);
    return;
  }

  // Bare `--json` lists what can be asked for. gh's best discoverability affordance,
  // and it costs nothing.
  if (options.json === "" && fields !== undefined) {
    for (const field of availableFields(fields)) {
      io.out(field);
    }
    return;
  }

  // `--jq` and `--template` imply the full field set when `--json` was not given, so
  // `bb pr list --jq '.[].title'` just works.
  const selected =
    fields === undefined
      ? undefined
      : options.json === undefined || options.json === ""
        ? availableFields(fields)
        : parseFieldSelection(options.json, fields);

  const payload =
    selected === undefined || fields === undefined
      ? result.data
      : result.data.map((row) => pickFields(row, selected, fields));

  if (options.template !== undefined) {
    io.out(
      renderTemplate(options.template, payload, {
        style: io.style,
        hyperlinks: io.hyperlinks,
      }).replace(/\n$/, ""),
    );
    return;
  }

  if (options.jq !== undefined) {
    const jq = await loadJq();
    for (const line of await jq.run(payload, options.jq)) {
      io.out(line);
    }
    return;
  }

  io.out(JSON.stringify(payload, null, 2));
};
