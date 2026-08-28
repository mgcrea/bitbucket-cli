import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { parse, stringify } from "yaml";

import { configFile } from "./paths.js";

export type Config = {
  aliases?: Record<string, string> | undefined;
  default_workspace?: string | undefined;
  git_protocol?: "ssh" | "https" | undefined;
};

export const readConfig = async (env?: NodeJS.ProcessEnv): Promise<Config> => {
  try {
    return (parse(await readFile(configFile(env), "utf8")) as Config | null) ?? {};
  } catch {
    return {};
  }
};

/** Written atomically so a concurrent `bb` never reads a half-written file. */
export const writeConfig = async (config: Config, env?: NodeJS.ProcessEnv): Promise<void> => {
  const target = configFile(env);
  await mkdir(dirname(target), { recursive: true, mode: 0o700 });
  const temporary = `${target}.tmp`;
  await writeFile(temporary, stringify(config), "utf8");
  await rename(temporary, target);
};
