import { http, passthrough } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { waitForCallbackCode } from "../../src/auth/oauth-callback.js";
import { createState } from "../../src/auth/oauth-flow.js";
import { server } from "../msw-server.js";

// The suite runs with `onUnhandledRequest: "error"`, which is right everywhere else —
// the URL we construct is the most valuable assertion in this codebase. But this file
// is the one place that must reach a real socket: it exists to prove the listener
// binds, answers and lets the port go again. So loopback is explicitly passed through.
beforeEach(() => {
  server.use(http.all(/^http:\/\/localhost:\d+\//, () => passthrough()));
});

/**
 * A distinct port per test. The production URI is fixed because Bitbucket matches the
 * callback against the consumer's configured value, but the tests must not collide with
 * each other or with a real login.
 */
let next = 18_724;
const redirectUri = (): string => `http://localhost:${(next += 1)}/callback`;

/**
 * MSW intercepts `fetch`, so these deliberately hit the loopback server for real —
 * the point of this suite is that the listener binds, answers and shuts down.
 */
const get = async (url: string): Promise<{ status: number; body: string }> => {
  const response = await fetch(url);
  return { status: response.status, body: await response.text() };
};

describe("waitForCallbackCode", () => {
  it("resolves the code once the browser comes back", async () => {
    const uri = redirectUri();
    const state = createState();
    const pending = waitForCallbackCode({
      state,
      redirectUri: uri,
      onListening: () => {
        void get(`${uri}?code=the-code&state=${encodeURIComponent(state)}`);
      },
    });
    await expect(pending).resolves.toBe("the-code");
  });

  it("rejects a callback whose state does not match, without spending the code", async () => {
    const uri = redirectUri();
    const pending = waitForCallbackCode({
      state: createState(),
      redirectUri: uri,
      onListening: () => {
        void get(`${uri}?code=attacker-code&state=${encodeURIComponent(createState())}`);
      },
    });
    await expect(pending).rejects.toThrow(/state did not match/);
  });

  it("rejects a callback with no state at all", async () => {
    const uri = redirectUri();
    const pending = waitForCallbackCode({
      state: createState(),
      redirectUri: uri,
      onListening: () => {
        void get(`${uri}?code=c`);
      },
    });
    await expect(pending).rejects.toThrow(/state did not match/);
  });

  it("surfaces Bitbucket's own denial rather than timing out", async () => {
    const uri = redirectUri();
    const state = createState();
    const pending = waitForCallbackCode({
      state,
      redirectUri: uri,
      onListening: () => {
        void get(
          `${uri}?error=access_denied&error_description=User+said+no&state=${encodeURIComponent(state)}`,
        );
      },
    });
    await expect(pending).rejects.toThrow(/access_denied.*User said no/);
  });

  it("rejects a callback that carries no code", async () => {
    const uri = redirectUri();
    const state = createState();
    const pending = waitForCallbackCode({
      state,
      redirectUri: uri,
      onListening: () => {
        void get(`${uri}?state=${encodeURIComponent(state)}`);
      },
    });
    await expect(pending).rejects.toThrow(/no authorization code/);
  });

  it("gives the port back on timeout, so the next attempt is not EADDRINUSE", async () => {
    // Without the timeout an abandoned login holds the port for the life of the
    // process, and the retry fails with something that points nowhere near the cause.
    const uri = redirectUri();
    await expect(
      waitForCallbackCode({ state: createState(), redirectUri: uri, timeoutMs: 40 }),
    ).rejects.toThrow(/Timed out/);

    // Proof it actually released: bind the same port again.
    const state = createState();
    await expect(
      waitForCallbackCode({
        state,
        redirectUri: uri,
        onListening: () => {
          void get(`${uri}?code=second&state=${encodeURIComponent(state)}`);
        },
      }),
    ).resolves.toBe("second");
  });

  it("ignores a request to another path instead of resolving on it", async () => {
    const uri = redirectUri();
    const state = createState();
    let probe = 0;
    const pending = waitForCallbackCode({
      state,
      redirectUri: uri,
      timeoutMs: 2_000,
      onListening: () => {
        void get(new URL("/favicon.ico", uri).toString())
          .then((response) => {
            probe = response.status;
            return get(`${uri}?code=real&state=${encodeURIComponent(state)}`);
          })
          .catch(() => undefined);
      },
    });
    await expect(pending).resolves.toBe("real");
    expect(probe).toBe(404);
  });
});
