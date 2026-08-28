import { defineBbCommand } from "../../command.js";
import type { FieldMap } from "../../output/fields.js";
import { getRuntime } from "../../runtime.js";

type AuthStatus = {
  host: string;
  authenticated: boolean;
  credential: string;
  source?: string | undefined;
  user?: string | undefined;
  uuid?: string | undefined;
  hasUserIdentity: boolean;
  unavailable: string[];
};

const CREDENTIAL_LABEL: Record<string, string> = {
  "api-token": "Atlassian API token",
  "access-token": "resource access token",
  oauth: "OAuth 2.0",
  anonymous: "none",
};

/** Everything that needs `GET /user`, and therefore breaks under an access token. */
const IDENTITY_DEPENDENT = [
  "bb pr status",
  "bb status",
  "--author @me filters",
  "bb repo list without --workspace",
];

const FIELDS: FieldMap<AuthStatus> = {
  host: { pick: (status) => status.host },
  authenticated: { pick: (status) => status.authenticated },
  credential: { pick: (status) => status.credential },
  source: { pick: (status) => status.source },
  user: { pick: (status) => status.user },
  uuid: { pick: (status) => status.uuid },
  hasUserIdentity: { pick: (status) => status.hasUserIdentity },
  unavailable: { pick: (status) => status.unavailable },
};

export default defineBbCommand<AuthStatus>({
  meta: { name: "status", description: "Show the active credential and what it can do" },
  fields: FIELDS,
  examples: ["bb auth status", "bb auth status --json hasUserIdentity"],
  async run() {
    const { client } = getRuntime();
    const bb = await client();
    const identity = await bb.users.whoami();
    const capabilities = bb.auth.capabilities;

    const status: AuthStatus = {
      host: "bitbucket.org",
      authenticated: bb.auth.kind !== "anonymous",
      credential: CREDENTIAL_LABEL[bb.auth.kind] ?? bb.auth.kind,
      source: bb.auth.source,
      user: identity.kind === "user" ? identity.user.displayName : undefined,
      uuid: identity.kind === "user" ? identity.user.uuid : undefined,
      hasUserIdentity: capabilities.hasUserIdentity,
      unavailable: capabilities.hasUserIdentity ? [] : IDENTITY_DEPENDENT,
    };

    return {
      kind: "data",
      data: [status],
      single: true,
      render: ([only], io) => {
        if (only === undefined) {
          return;
        }
        io.out(io.style("bold", only.host));
        if (!only.authenticated) {
          io.out(`  ${io.style("red", "✗")} Not logged in`);
          io.out(io.style("dim", "    Run `bb auth login`, or set BB_TOKEN."));
          return;
        }

        io.out(
          only.user === undefined
            ? `  ${io.style("green", "✓")} Authenticated with a ${only.credential}`
            : `  ${io.style("green", "✓")} Logged in as ${only.user}`,
        );
        io.out(`    Credential: ${only.credential}`);
        if (only.source !== undefined) {
          io.out(`    Source:     ${only.source}`);
        }
        // Reporting the credential TYPE matters because capability differs per type.
        if (only.hasUserIdentity) {
          io.out(`    Identity:   yes${only.uuid === undefined ? "" : ` (${only.uuid})`}`);
        } else {
          io.out(`    Identity:   ${io.style("yellow", "no")} — this credential has no account`);
          io.out(io.style("dim", `    Unavailable: ${only.unavailable.join(", ")}`));
        }
      },
    };
  },
});
