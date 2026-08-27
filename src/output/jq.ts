/**
 * jq support, isolated behind one module so the engine can be swapped in one edit.
 *
 * `jq-wasm` is ~3.9 MB and instantiating the WASM module costs 30-60 ms, so it is
 * loaded only when `--jq` actually appears on the command line. Everyone else pays
 * nothing.
 */

export type JqEngine = {
  /** Run `expression` over `input`. Returns one output per jq result. */
  run(input: unknown, expression: string): Promise<string[]>;
};

import { lazyImport } from "./lazy.js";

type JqWasmModule = {
  json(input: unknown, expression: string): Promise<unknown>;
  raw(input: string, expression: string, flags?: string[]): Promise<{ stdout: string }>;
};

let cached: Promise<JqEngine> | undefined;

export const loadJq = (): Promise<JqEngine> => {
  cached ??= lazyImport("jq-wasm").then((module) => createEngine(module as JqWasmModule));
  return cached;
};

const createEngine = (jq: JqWasmModule): JqEngine => ({
  async run(input, expression) {
    // `raw` gives us jq's own line-oriented output, which is what `jq -r` produces
    // and therefore what `gh --jq` users expect.
    const result = await jq.raw(JSON.stringify(input), expression, ["-r"]);
    const stdout = result.stdout.replace(/\n$/, "");
    return stdout === "" ? [] : stdout.split("\n");
  },
});
