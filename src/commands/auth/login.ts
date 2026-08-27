import { createApiTokenAuth } from "../../auth/api-token.js";
import { createBitbucketClient } from "../../client/bitbucket-client.js";
import { defineBbCommand } from "../../command.js";
import { writeCredential } from "../../config/hosts.js";
import { UsageError } from "../../errors.js";
import { AuthenticationError, AuthorizationError } from "../../http/errors.js";
import { getRuntime } from "../../runtime.js";

const TOKEN_PAGE = "https://id.atlassian.com/manage-profile/security/api-tokens";

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk as Buffer));
  }
  return Buffer.concat(chunks).toString("utf8").trim();
};

export default defineBbCommand<never>({
  meta: { name: "login", description: "Authenticate with Bitbucket" },
  args: {
    "with-token": { type: "boolean", description: "Read the token from stdin" },
    email: { type: "string", alias: "e", description: "Your Atlassian account email" },
    "token-type": { type: "string", description: "api-token (default) or access-token" },
    web: { type: "boolean", description: "Not yet implemented" },
  },
  examples: [
    "bb auth login --with-token < token.txt",
    "bb auth login --with-token --email me@example.com < token.txt",
  ],
  async run({ args }) {
    const { io } = getRuntime();

    if (process.env["BB_TOKEN"] !== undefined || process.env["BITBUCKET_TOKEN"] !== undefined) {
      throw new UsageError(
        "BB_TOKEN is set in the environment, so a stored login would be ignored.",
        "Unset it first, or keep using the environment variable.",
      );
    }

    if (args["web"] === true) {
      // Being explicit is better than a half-working flow: Bitbucket has no
      // device-code grant, and loopback OAuth needs a registered consumer.
      throw new UsageError(
        "`--web` is not implemented yet.",
        `Create an API token at ${TOKEN_PAGE} (choose Bitbucket as the app), then run:\n` +
          "  bb auth login --with-token < token.txt",
      );
    }

    if (args["with-token"] !== true) {
      throw new UsageError(
        "Pass --with-token and pipe the token in on stdin.",
        `Create one at ${TOKEN_PAGE} — you must select "Bitbucket" as the app, because a\n` +
          "  plain unscoped Atlassian token is rejected by the Bitbucket API.",
      );
    }

    // stdin only, never argv: a token in argv leaks to `ps`, shell history and CI logs.
    const token = await readStdin();
    if (token === "") {
      throw new UsageError("No token received on stdin.");
    }

    const kind = args["token-type"] === "access-token" ? "access-token" : "api-token";
    const email = args["email"] as string | undefined;

    if (kind === "access-token") {
      await writeCredential({ kind, token });
      io.info("Stored a resource access token.");
      io.info("Note: access tokens have no user identity, so `bb pr status` will not work.");
      return { kind: "none" };
    }

    // Basic is preferred whenever an email is available, and not only for
    // compatibility: Bitbucket returns a far more specific failure for it. An unscoped
    // token answers Basic with "API Token provided has no Bitbucket scopes", where
    // Bearer only says "invalid, expired, or not supported for this endpoint".
    const transport = email === undefined ? "bearer" : "basic";
    const auth = createApiTokenAuth({ token, email, transport });

    // Deliberately `current()` rather than `whoami()`: whoami degrades a 401 into a
    // described identity, which would swallow the API's own explanation of what is
    // wrong with the token. Here that explanation is the whole value.
    const user = await createBitbucketClient({ auth })
      .users.current()
      .catch((error: unknown) => {
        if (!(error instanceof AuthenticationError || error instanceof AuthorizationError)) {
          throw error;
        }
        const hints = [
          "Bitbucket requires an API token that carries Bitbucket scopes. A plain",
          `  unscoped Atlassian token is rejected. Create one at ${TOKEN_PAGE} using`,
          '  "Create API token with scopes" and select Bitbucket as the app.',
        ];
        if (transport === "bearer") {
          hints.push(
            "",
            "  Re-running with --email <your-atlassian-email> will report the exact reason:",
            "  Bitbucket answers Basic auth with a specific message and Bearer with a generic one.",
          );
        }
        throw new UsageError(error.message, hints.join("\n"));
      });

    // Persist the Bitbucket username alongside the email. REST authenticates as the
    // email while git over HTTPS wants the username, and conflating them produces a
    // 403 on push that looks nothing like an auth-setup mistake.
    await writeCredential({
      kind,
      token,
      email,
      username: user.nickname,
      uuid: user.uuid,
    });

    io.info(`Logged in as ${user.displayName}.`);
    return { kind: "none" };
  },
});
