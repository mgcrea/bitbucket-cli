import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./msw-server.js";

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
});
