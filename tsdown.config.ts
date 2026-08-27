import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/bin/cli.ts"],
  format: ["cjs", "esm"],
  target: "node22",
  platform: "node",
  dts: true,
  sourcemap: true,
  clean: true,
  // Keeps the output at the stable `dist/bin/cli.cjs` path that `bin` points at.
  hash: false,
  // citty is ESM-only, so it cannot be `require`d from the CJS bin — it has to be
  // bundled in. `yaml` is bundled because config is read on nearly every invocation
  // and an extra module resolution on the startup path is not worth the install saving.
  //
  // `jq-wasm` and `@clack/prompts` are deliberately NOT bundled: both are loaded
  // lazily and jq-wasm resolves its .wasm relative to its own package directory,
  // which only works if it stays on disk as a real package. See src/output/jq.ts.
  noExternal: ["citty", "yaml"],
});
