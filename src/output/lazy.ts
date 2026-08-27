/**
 * Imports a module by specifier without letting a bundler rewrite the call.
 *
 * rolldown turns a literal `await import("x")` in a CJS output into
 * `Promise.resolve().then(() => require("x"))`. That breaks two things we depend on:
 * `jq-wasm` resolves its `.wasm` relative to its own package directory and must stay a
 * real package on disk, and `@clack/prompts` is ESM-only so it needs a genuine dynamic
 * import for `require(esm)` interop.
 *
 * Routing through `new Function` keeps the specifier opaque to the bundler. Some hosts
 * — vitest's module runner among them — refuse that with "a dynamic import callback was
 * not specified", so a direct `import()` is the fallback. The bundle takes the first
 * path; test and dev runners take the second.
 */
const indirectImport = (() => {
  try {
    return new Function("specifier", "return import(specifier)") as (
      specifier: string,
    ) => Promise<unknown>;
  } catch {
    return undefined;
  }
})();

export const lazyImport = async (specifier: string): Promise<unknown> => {
  if (indirectImport !== undefined) {
    try {
      return await indirectImport(specifier);
    } catch (error) {
      // Only fall through on a host that cannot service the indirect form; a genuinely
      // missing module must still surface as itself.
      if (!(error instanceof TypeError && /dynamic import callback/i.test(error.message))) {
        throw error;
      }
    }
  }
  return import(/* @vite-ignore */ specifier);
};
