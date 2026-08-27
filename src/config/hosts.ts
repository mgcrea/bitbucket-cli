import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { parse, stringify } from "yaml";

import { hostsFile } from "./paths.js";

export type StoredCredential = {
  kind: "api-token" | "access-token" | "oauth";
  token: string;
  email?: string | undefined;
  username?: string | undefined;
  uuid?: string | undefined;
  expiresAt?: string | undefined;
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
