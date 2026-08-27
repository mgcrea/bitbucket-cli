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

/**
 * Resists bundler rewriting.
 *
 * rolldown turns a literal `await import("jq-wasm")` in a CJS output into
 * `Promise.resolve().then(() => require(...))`, which would inline the package and
 * break jq-wasm's resolution of its own `dist/build/jq.wasm` (it locates the binary
 * relative to its package directory). Going through `new Function` keeps the specifier
 * opaque to the bundler, so the real package is resolved from node_modules at runtime.
 */
const dynamicImport = new Function("specifier", "return import(specifier)") as (
  specifier: string,
) => Promise<unknown>;

type JqWasmModule = {
  json(input: unknown, expression: string): Promise<unknown>;
  raw(input: string, expression: string, flags?: string[]): Promise<{ stdout: string }>;
};

let cached: Promise<JqEngine> | undefined;

export const loadJq = (): Promise<JqEngine> => {
  cached ??= dynamicImport("jq-wasm").then((module) => createEngine(module as JqWasmModule));
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
