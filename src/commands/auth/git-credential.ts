import { resolveAuth } from "../../auth/from-store.js";
import { defineBbCommand } from "../../command.js";

/**
 * Parses git's `key=value` credential block.
 *
 * Split on the FIRST `=` only: values may legitimately contain one — base64 tokens
 * routinely end in `=`, and a repository path can carry one too. Splitting on every
 * occurrence silently drops those lines.
 */
export const parseCredentialRequest = (input: string): Record<string, string> => {
  const request: Record<string, string> = {};
  for (const line of input.split("\n")) {
    const separator = line.indexOf("=");
    if (separator > 0) {
      request[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
    }
  }
  return request;
};

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk as Buffer));
  }
  return Buffer.concat(chunks).toString("utf8");
};

/**
 * Implements git's credential helper protocol.
 *
 * git invokes this with an operation and a key=value block on stdin, and reads the
 * answer back the same way. Using it means the token is handed to git per-operation and
 * never written into `.git/config` or a remote URL — which is what happens if you clone
 * `https://user:token@bitbucket.org/...`.
 *
 * Hidden, because it is for git to call rather than a person.
 */
export default defineBbCommand<never>({
  meta: {
    name: "git-credential",
    description: "Git credential helper (used by git, not by you)",
    hidden: true,
  },
  args: {
    operation: { type: "positional", description: "get, store or erase", required: false },
  },
  async run({ args }) {
    const operation = (args["operation"] as string | undefined) ?? "get";

    // Only `get` has anything to do. Storing is a no-op because the credential already
    // lives in our own store, and erasing must not delete it — git asks for that on any
    // auth failure, which would silently log the user out.
    if (operation !== "get") {
      return { kind: "none" };
    }

    const request = parseCredentialRequest(await readStdin());

    if (request["host"] !== undefined && !request["host"].endsWith("bitbucket.org")) {
      return { kind: "none" };
    }

    const credentials = (await resolveAuth()).gitCredentials();
    if (credentials === undefined) {
      return { kind: "none" };
    }

    return {
      kind: "text",
      text: `username=${credentials.username}\npassword=${credentials.password}`,
    };
  },
});
