import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./msw-server.js";

// Point every test at a throwaway config directory. Commands read the config file
// through `process.env`, so without this the suite would pick up whoever's machine it
// runs on — a developer with `default_workspace` set would see different results from
// CI, which is the sort of failure nobody debugs on the first day.
const configHome = mkdtempSync(join(tmpdir(), "bb-test-config-"));
process.env["BB_CONFIG_DIR"] = configHome;

beforeAll(() => {
  // Any request without a handler is a bug in the test, not something to pass through:
  // the URL we construct is the single most valuable assertion in this codebase.
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
  rmSync(configHome, { recursive: true, force: true });
});
