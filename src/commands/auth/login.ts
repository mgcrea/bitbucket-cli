import { createApiTokenAuth } from "../../auth/api-token.js";
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

export default defineBbCommand<never>({
  meta: { name: "login", description: "Authenticate with Bitbucket" },
  args: {
    "with-token": { type: "boolean", description: "Read the token from stdin, without prompting" },
    email: { type: "string", alias: "e", description: "Your Atlassian account email" },
    "token-type": { type: "string", description: "api-token (default) or access-token" },
    web: { type: "boolean", description: "Not yet implemented" },
  },
  examples: ["bb auth login", "bb auth login --with-token --email me@example.com < token.txt"],
  async run({ args }) {
    const { io } = getRuntime();

    if (process.env["BB_TOKEN"] !== undefined || process.env["BITBUCKET_TOKEN"] !== undefined) {
      throw new UsageError(
        "BB_TOKEN is set in the environment, so a stored login would be ignored.",
        "Unset it first, or keep using the environment variable.",
      );
    }

    if (args["web"] === true) {
      throw new UsageError(
        "`--web` is not implemented yet.",
        `Run \`bb auth login\` and paste a token from ${TOKEN_PAGE} instead.`,
      );
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

    if (await prompt.confirm({ message: "Open the token page in your browser?" })) {
      const opened = await openBrowser(TOKEN_PAGE);
      if (!opened) {
        io.info(`Could not open a browser. Visit: ${TOKEN_PAGE}`);
      }
    } else {
      io.info(TOKEN_PAGE);
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
        io.error(error.message);
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
