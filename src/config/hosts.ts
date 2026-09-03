import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { parse, stringify } from "yaml";

import { hostsFile } from "./paths.js";

export type StoredCredential = {
  kind: "api-token" | "access-token" | "oauth";
  /** The access token for `oauth`; the long-lived secret for the other two kinds. */
  token: string;
  email?: string | undefined;
  username?: string | undefined;
  uuid?: string | undefined;
  expiresAt?: string | undefined;
  // ---- `oauth` only ----------------------------------------------------------------
  refreshToken?: string | undefined;
  /**
   * The generation before `refreshToken`.
   *
   * Atlassian does not document whether Bitbucket rotates refresh tokens on use. If it
   * does, a crash between the token response and the write leaves the stored token
   * already dead, and the only recovery is a full browser login. Keeping one previous
   * generation covers exactly that window.
   */
  previousRefreshToken?: string | undefined;
  /**
   * What Bitbucket granted, read back off the token response.
   *
   * Recorded rather than requested: Bitbucket Cloud ignores the `scope` parameter on a
   * grant, so scopes are whatever the OAuth consumer was configured with. The only way
   * to know what a credential can do is to look at what came back.
   */
  scopes?: readonly string[] | undefined;
  /**
   * Which consumer issued this. A stored token is useless against a different
   * `client_id`, and comparing up front turns a confusing `invalid_grant` into
   * "these credentials belong to another consumer".
   */
  clientId?: string | undefined;
  /**
   * The consumer secret.
   *
   * Stored deliberately. Bitbucket Cloud does not support PKCE, so refreshing is a
   * confidential-client operation and the secret is needed for the life of the login —
   * not just during it. The alternative is demanding an env var on every invocation,
   * which is worse than keeping it beside the refresh token it is useless without, in
   * a file that is already 0600.
   */
  clientSecret?: string | undefined;
};

export type Hosts = Record<string, StoredCredential>;

export const DEFAULT_HOST = "bitbucket.org";

export const readHosts = async (env?: NodeJS.ProcessEnv): Promise<Hosts> => {
  try {
    const raw = await readFile(hostsFile(env), "utf8");
    return (parse(raw) as Hosts | null) ?? {};
  } catch {
    return {};
  }
};

/**
 * Writes credentials at mode 0600, atomically.
 *
 * This is what `gh` does, and the honest description is worth stating plainly: 0600
 * keeps the file out of a screenshare and out of a dotfile sync, and does nothing at
 * all against a local attacker. An "encrypted" file whose key is derivable on the same
 * machine would be obfuscation dressed up as security, so we do not offer one.
 */
export const writeHosts = async (hosts: Hosts, env?: NodeJS.ProcessEnv): Promise<void> => {
  const target = hostsFile(env);
  await mkdir(dirname(target), { recursive: true, mode: 0o700 });

  // Write-then-rename, so a concurrent `bb` never reads a half-written file.
  const temporary = `${target}.tmp`;
  await writeFile(temporary, stringify(hosts), { mode: 0o600 });
  await chmod(temporary, 0o600);
  await rename(temporary, target);
};

export const readCredential = async (
  host = DEFAULT_HOST,
  env?: NodeJS.ProcessEnv,
): Promise<StoredCredential | undefined> => (await readHosts(env))[host];

export const writeCredential = async (
  credential: StoredCredential,
  host = DEFAULT_HOST,
  env?: NodeJS.ProcessEnv,
): Promise<void> => {
  const hosts = await readHosts(env);
  hosts[host] = credential;
  await writeHosts(hosts, env);
};

export const deleteCredential = async (
  host = DEFAULT_HOST,
  env?: NodeJS.ProcessEnv,
): Promise<boolean> => {
  const hosts = await readHosts(env);
  if (hosts[host] === undefined) {
    return false;
  }
  delete hosts[host];
  await writeHosts(hosts, env);
  return true;
};
