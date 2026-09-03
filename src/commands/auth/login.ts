import { createApiTokenAuth } from "../../auth/api-token.js";
import { waitForCallbackCode } from "../../auth/oauth-callback.js";
import {
  authorizeUrl,
  createState,
  DEFAULT_REDIRECT_URI,
  exchangeCode,
} from "../../auth/oauth-flow.js";
import { createOAuthAuth, hostsTokenStore, toStored } from "../../auth/oauth.js";
import { openBrowser } from "../../browser.js";
import { createBitbucketClient } from "../../client/bitbucket-client.js";
import { defineBbCommand } from "../../command.js";
import { writeCredential } from "../../config/hosts.js";
import { UsageError } from "../../errors.js";
import type { UserRef } from "../../flavor/domain.js";
import { tryGit } from "../../git/exec.js";
import { AuthenticationError, AuthorizationError } from "../../http/errors.js";
import { createPrompter } from "../../prompt/index.js";
import { getRuntime } from "../../runtime.js";

const TOKEN_PAGE = "https://id.atlassian.com/manage-profile/security/api-tokens";

const CONSUMER_HELP =
  "A browser login needs an OAuth consumer, which you create once per workspace:\n" +
  "  Workspace settings \u2192 Apps and features \u2192 OAuth consumers \u2192 Add consumer\n" +
  `Set its callback URL to ${DEFAULT_REDIRECT_URI} and tick the permissions you want.\n` +
  "Then pass --client-id, or set BB_OAUTH_CLIENT_ID and BB_OAUTH_CLIENT_SECRET.";

const SCOPE_HELP =
  "Bitbucket needs an API token that carries Bitbucket scopes.\n" +
  'Use "Create API token with scopes" and pick Bitbucket as the app —\n' +
  "a plain unscoped Atlassian token is rejected.";

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk as Buffer));
  }
  return Buffer.concat(chunks).toString("utf8").trim();
};

type Verified = { user: UserRef; transport: "basic" | "bearer" };

/**
 * Confirms a credential before storing it.
 *
 * Uses `current()` rather than `whoami()` on purpose: whoami degrades a 401 into a
 * described identity, and here Bitbucket's own message is the whole diagnosis — an
 * unscoped token answers Basic with "API Token provided has no Bitbucket scopes".
 */
const verify = async (token: string, email: string | undefined): Promise<Verified> => {
  const transport = email === undefined ? "bearer" : "basic";
  const auth = createApiTokenAuth({ token, email, transport });
  const user = await createBitbucketClient({ auth }).users.current();
  return { user, transport };
};

const isAuthFailure = (error: unknown): error is AuthenticationError | AuthorizationError =>
  error instanceof AuthenticationError || error instanceof AuthorizationError;

/**
 * The three-legged browser flow.
 *
 * There is no PKCE here, and its absence is not an oversight: Bitbucket Cloud does not
 * support it. That makes this a confidential-client flow, so `state` is the only
 * defence against a forged callback and the secret has to be kept for the life of the
 * login rather than just for the exchange.
 */
const runWebLogin = async (consumer: {
  clientId: string;
  clientSecret: string;
}): Promise<{ kind: "none" }> => {
  const { io } = getRuntime();
  const state = createState();
  const url = authorizeUrl({
    clientId: consumer.clientId,
    state,
    redirectUri: DEFAULT_REDIRECT_URI,
  });

  // The listener is started before the browser opens, so a fast redirect cannot arrive
  // at a port that is not bound yet.
  const codePromise = waitForCallbackCode({
    state,
    redirectUri: DEFAULT_REDIRECT_URI,
    onListening: () => {
      void openBrowser(url).then((opened) =>
        io.info(
          opened
            ? "Opened your browser to authorize this consumer."
            : `Could not open a browser. Visit:\n${url}`,
        ),
      );
    },
  });

  const code = await codePromise;
  const tokens = await exchangeCode({
    clientId: consumer.clientId,
    clientSecret: consumer.clientSecret,
    code,
    redirectUri: DEFAULT_REDIRECT_URI,
  });

  await writeCredential(toStored(undefined, tokens, consumer));

  // Identity is fetched *after* storing, through the strategy that will be used from
  // now on: it proves the stored credential actually works, and a failure here leaves a
  // usable login rather than discarding one that was fine.
  const auth = createOAuthAuth({ ...consumer, store: hostsTokenStore() });
  const user = await createBitbucketClient({ auth }).users.current();
  await writeCredential({
    ...toStored(undefined, tokens, consumer),
    username: user.username,
    uuid: user.uuid,
  });

  io.info(`Logged in as ${user.displayName}.`);
  // Reported rather than requested. Bitbucket ignores a `scope` parameter on the grant,
  // so these are whatever the consumer was configured with — and the usual cause of a
  // later 403 is a permission that was never ticked.
  io.info(
    tokens.scopes.length === 0
      ? "Bitbucket reported no scopes for this consumer."
      : `Granted scopes: ${tokens.scopes.join(", ")}`,
  );
  return { kind: "none" };
};

export default defineBbCommand<never>({
  meta: { name: "login", description: "Authenticate with Bitbucket" },
  args: {
    "with-token": { type: "boolean", description: "Read the token from stdin, without prompting" },
    email: { type: "string", alias: "e", description: "Your Atlassian account email" },
    "token-type": { type: "string", description: "api-token (default) or access-token" },
    web: { type: "boolean", description: "Authenticate in a browser via OAuth 2.0" },
    "client-id": { type: "string", description: "OAuth consumer key (implies --web)" },
    "client-secret": { type: "string", description: "OAuth consumer secret (implies --web)" },
  },
  examples: [
    "bb auth login",
    "bb auth login --with-token --email me@example.com < token.txt",
    "bb auth login --web --client-id KEY --client-secret SECRET",
  ],
  async run({ args }) {
    const { io } = getRuntime();

    if (process.env["BB_TOKEN"] !== undefined || process.env["BITBUCKET_TOKEN"] !== undefined) {
      throw new UsageError(
        "BB_TOKEN is set in the environment, so a stored login would be ignored.",
        "Unset it first, or keep using the environment variable.",
      );
    }

    const clientId = (args["client-id"] as string | undefined) ?? process.env["BB_OAUTH_CLIENT_ID"];
    const clientSecret =
      (args["client-secret"] as string | undefined) ?? process.env["BB_OAUTH_CLIENT_SECRET"];

    if (args["web"] === true || args["client-id"] !== undefined) {
      if (clientId === undefined || clientSecret === undefined) {
        throw new UsageError(
          "A browser login needs an OAuth consumer key and secret.",
          CONSUMER_HELP,
        );
      }
      return runWebLogin({ clientId, clientSecret });
    }

    const flagEmail = args["email"] as string | undefined;
    const flagKind = args["token-type"] === "access-token" ? "access-token" : "api-token";

    // ---- Non-interactive: stdin, no prompting. This path must never block. --------
    if (args["with-token"] === true || !io.isInteractive) {
      if (args["with-token"] !== true) {
        throw new UsageError(
          "Cannot prompt for a token because this is not an interactive terminal.",
          "Pipe it in instead:  bb auth login --with-token --email you@example.com < token.txt",
        );
      }
      const token = await readStdin();
      if (token === "") {
        throw new UsageError("No token received on stdin.");
      }

      if (flagKind === "access-token") {
        await writeCredential({ kind: flagKind, token });
        io.info("Stored a resource access token.");
        io.info("Note: access tokens have no user identity, so `bb pr status` will not work.");
        return { kind: "none" };
      }

      const verified = await verify(token, flagEmail).catch((error: unknown) => {
        if (!isAuthFailure(error)) {
          throw error;
        }
        const hint =
          flagEmail === undefined
            ? `${SCOPE_HELP}\n\n  Re-run with --email to get the exact reason: Bitbucket answers Basic\n  auth with a specific message and Bearer with a generic one.`
            : SCOPE_HELP;
        throw new UsageError(error.message, hint);
      });

      await writeCredential({
        kind: flagKind,
        token,
        email: flagEmail,
        username: verified.user.username,
        uuid: verified.user.uuid,
      });
      io.info(`Logged in as ${verified.user.displayName}.`);
      return { kind: "none" };
    }

    // ---- Interactive ------------------------------------------------------------
    const prompt = await createPrompter();
    await prompt.intro("Log in to Bitbucket");

    const kind =
      (args["token-type"] as string | undefined) === undefined
        ? await prompt.select({
            message: "How do you want to authenticate?",
            options: [
              {
                value: "api-token" as const,
                label: "Atlassian API token",
                hint: "for your own account — the usual choice",
              },
              {
                value: "access-token" as const,
                label: "Repository or workspace access token",
                hint: "for CI — no user identity",
              },
            ],
          })
        : flagKind;

    if (kind === "access-token") {
      const token = await prompt.password({
        message: "Paste the access token",
        validate: (value) => (value.trim() === "" ? "A token is required" : undefined),
      });
      await writeCredential({ kind, token: token.trim() });
      await prompt.outro("Stored a resource access token.");
      io.info("Note: access tokens have no user identity, so `bb pr status` will not work.");
      return { kind: "none" };
    }

    await prompt.note(SCOPE_HELP, "Before you start");

    // Routed through the prompter rather than `io` so these lines stay inside clack's
    // gutter instead of breaking out of the box.
    if (await prompt.confirm({ message: "Open the token page in your browser?" })) {
      const opened = await openBrowser(TOKEN_PAGE);
      await (opened
        ? prompt.message("Opened your browser.")
        : prompt.warn(`Could not open a browser. Visit:\n${TOKEN_PAGE}`));
    } else {
      await prompt.message(TOKEN_PAGE);
    }

    // A sensible default: the address most people use for Atlassian is the one already
    // configured in git.
    const gitEmail = await tryGit(["config", "--get", "user.email"]);

    // Retry in place rather than making the user re-run the whole command; a rejected
    // token is usually the wrong one pasted, or the unscoped variety.
    for (let attempt = 1; ; attempt += 1) {
      const email =
        flagEmail ??
        (await prompt.text({
          message: "Atlassian account email",
          // Offered as a default rather than prefilled text, so accepting it is one
          // keystroke and replacing it does not mean deleting it first.
          ...(gitEmail === undefined || gitEmail === ""
            ? { placeholder: "you@example.com" }
            : { defaultValue: gitEmail, placeholder: gitEmail }),
          validate: (value) =>
            value.includes("@") ? undefined : "That does not look like an email address",
        }));

      const token = await prompt.password({
        message: "Paste your API token",
        validate: (value) => (value.trim() === "" ? "A token is required" : undefined),
      });

      try {
        const verified = await verify(token.trim(), email);
        await writeCredential({
          kind: "api-token",
          token: token.trim(),
          email,
          username: verified.user.username,
          uuid: verified.user.uuid,
        });
        await prompt.outro(`Logged in as ${verified.user.displayName}.`);
        return { kind: "none" };
      } catch (error) {
        if (!isAuthFailure(error)) {
          throw error;
        }
        await prompt.warn(error.message);
        if (attempt >= 3) {
          throw new UsageError("Giving up after three attempts.", SCOPE_HELP);
        }
        if (!(await prompt.confirm({ message: "Try again?" }))) {
          throw new UsageError("Login cancelled.", SCOPE_HELP);
        }
      }
    }
  },
});
