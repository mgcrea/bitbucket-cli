import { readFileSync } from "node:fs";
import { defineConfig } from "tsdown";

const { version } = JSON.parse(readFileSync("./package.json", "utf8")) as { version: string };

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
  // Baked in at build time so the bin never has to locate package.json at runtime,
  // which is fragile once the file is a symlink on PATH.
  define: { __BB_VERSION__: JSON.stringify(version) },
  deps: {
    // citty is ESM-only and cannot be `require`d from the CJS bin, so bundling it is
    // required rather than an optimisation. `yaml` is bundled because config is read on
    // nearly every invocation.
    //
    // `jq-wasm` and `@clack/prompts` are deliberately left out: both load lazily, and
    // jq-wasm resolves its .wasm relative to its own package directory, which only
    // works while it stays a real package on disk. See src/output/lazy.ts.
    alwaysBundle: ["citty", "yaml"],
  },
});
