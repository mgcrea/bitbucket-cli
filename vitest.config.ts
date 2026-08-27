import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.spec.ts", "src/**/*.test.ts"],
    // Live tests hit the real API and are opt-in via `pnpm run spec:live`.
    exclude: ["test/smoke/**", "node_modules/**", "dist/**"],
    setupFiles: ["test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/generated/**", "src/**/*.test.ts", "src/index.ts", "src/**/index.ts"],
    },
  },
});
