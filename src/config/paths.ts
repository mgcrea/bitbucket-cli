import { homedir } from "node:os";
import { join } from "node:path";

/** `$BB_CONFIG_DIR` → `$XDG_CONFIG_HOME/bb` → `%AppData%\bb` → `~/.config/bb`. */
export const configDir = (env: NodeJS.ProcessEnv = process.env): string => {
  const explicit = env["BB_CONFIG_DIR"];
  if (explicit !== undefined && explicit !== "") {
    return explicit;
  }
  const xdg = env["XDG_CONFIG_HOME"];
  if (xdg !== undefined && xdg !== "") {
    return join(xdg, "bb");
  }
  if (process.platform === "win32") {
    const appData = env["AppData"];
    if (appData !== undefined && appData !== "") {
      return join(appData, "bb");
    }
  }
  return join(homedir(), ".config", "bb");
};

export const configFile = (env?: NodeJS.ProcessEnv): string => join(configDir(env), "config.yml");
export const hostsFile = (env?: NodeJS.ProcessEnv): string => join(configDir(env), "hosts.yml");
