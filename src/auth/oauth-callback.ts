import { createServer } from "node:http";

import {
  CALLBACK_TIMEOUT_MS,
  DEFAULT_REDIRECT_URI,
  OAuthError,
  statesMatch,
} from "./oauth-flow.js";

const page = (title: string, body: string): string =>
  `<!doctype html><meta charset="utf-8"><title>${title}</title>` +
  `<style>body{font:16px/1.5 system-ui,sans-serif;margin:4rem auto;max-width:32rem;padding:0 1rem}` +
  `h1{font-size:1.25rem}</style><h1>${title}</h1><p>${body}</p>`;

export type WaitForCodeOptions = {
  /** Must match the URL registered on the consumer, since the port cannot be dynamic. */
  redirectUri?: string | undefined;
  /** The value sent on the authorize leg; anything else is rejected. */
  state: string;
  timeoutMs?: number | undefined;
  /** Called once the port is bound, so the browser is only opened after that. */
  onListening?: (() => void) | undefined;
};

/**
 * Serve the OAuth callback once, then shut down.
 *
 * The timeout matters: without it an abandoned login leaves the port bound for the
 * lifetime of the process, and the next attempt fails with `EADDRINUSE` rather than
 * anything that points at the real problem.
 */
export const waitForCallbackCode = async (options: WaitForCodeOptions): Promise<string> => {
  const redirectUri = options.redirectUri ?? DEFAULT_REDIRECT_URI;
  const target = new URL(redirectUri);
  const port = Number(target.port === "" ? 80 : target.port);

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      // `close` only stops new connections; the keep-alive socket the browser just
      // used would hold the process open without this.
      server.closeAllConnections();
      server.close(() => fn());
    };

    const server = createServer((request, response) => {
      const url = new URL(request.url ?? "/", redirectUri);
      if (url.pathname !== target.pathname) {
        response.writeHead(404).end();
        return;
      }

      const error = url.searchParams.get("error");
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (error !== null) {
        const description = url.searchParams.get("error_description");
        response
          .writeHead(400, { "content-type": "text/html; charset=utf-8" })
          .end(page("Authorization failed", description ?? error));
        finish(() =>
          reject(
            new OAuthError(
              `Bitbucket denied the authorization request: ${error}` +
                (description === null ? "" : ` — ${description}`),
            ),
          ),
        );
        return;
      }

      // Checked before the code is used: a callback carrying someone else's state is
      // a cross-site request, and the code in it must not be spent.
      if (state === null || !statesMatch(state, options.state)) {
        response
          .writeHead(400, { "content-type": "text/html; charset=utf-8" })
          .end(page("Authorization failed", "The state parameter did not match."));
        finish(() =>
          reject(
            new OAuthError("The OAuth callback state did not match the request.", {
              hint: "Start the login again; do not reuse an old browser tab.",
            }),
          ),
        );
        return;
      }

      if (code === null || code === "") {
        response
          .writeHead(400, { "content-type": "text/html; charset=utf-8" })
          .end(page("Authorization failed", "No authorization code was returned."));
        finish(() => reject(new OAuthError("The OAuth callback carried no authorization code.")));
        return;
      }

      response
        .writeHead(200, { "content-type": "text/html; charset=utf-8" })
        .end(page("Signed in to Bitbucket", "You can close this tab and return to the terminal."));
      finish(() => resolve(code));
    });

    const timer = setTimeout(() => {
      finish(() =>
        reject(
          new OAuthError(
            `Timed out after ${Math.round((options.timeoutMs ?? CALLBACK_TIMEOUT_MS) / 1000)}s ` +
              "waiting for the browser to come back.",
            { hint: "Run the login again, or paste a token with `bb auth login`." },
          ),
        ),
      );
    }, options.timeoutMs ?? CALLBACK_TIMEOUT_MS);
    // Do not let the pending timer keep the event loop alive on its own.
    timer.unref?.();

    server.once("error", (cause: NodeJS.ErrnoException) => {
      finish(() =>
        reject(
          cause.code === "EADDRINUSE"
            ? new OAuthError(`Port ${port} is already in use, so the callback cannot be served.`, {
                hint:
                  "Another login may still be waiting. The port is fixed because Bitbucket " +
                  "matches the callback against the consumer's configured URL.",
                cause,
              })
            : new OAuthError(`Could not listen on ${redirectUri}`, { cause }),
        ),
      );
    });

    // Bound to loopback explicitly. Without a host argument Node listens on every
    // interface, which would expose the callback to the whole network.
    server.listen(port, "127.0.0.1", () => options.onListening?.());
  });
};
