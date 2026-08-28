import type { Config } from "./config.js";

/**
 * The settings `bb config` can read and write.
 *
 * A closed registry rather than a free-form key/value store, because a typo in
 * `bb config set defualt_workspace acme` would otherwise be accepted and then quietly
 * ignored forever — the worst kind of configuration bug. Every key here is read
 * somewhere; `aliases` is deliberately absent, since `bb alias` owns it and its value
 * is a map rather than a scalar.
 */
export type SettingKey = "default_workspace" | "git_protocol";

export type Setting = {
  readonly description: string;
  /** Allowed values, when the setting is an enum. Also drives shell completion. */
  readonly values?: readonly string[] | undefined;
};

export const SETTINGS: Record<SettingKey, Setting> = {
  default_workspace: {
    description: "Workspace to use when no --workspace flag, BB_WORKSPACE or git remote applies",
  },
  git_protocol: {
    description: "Protocol to clone with when no --protocol flag is given",
    values: ["https", "ssh"],
  },
};

export const SETTING_KEYS = Object.keys(SETTINGS) as SettingKey[];

export const isSettingKey = (key: string): key is SettingKey => key in SETTINGS;

/** Reads a setting as a string, so `get` and `list` share one code path. */
export const readSetting = (config: Config, key: SettingKey): string | undefined => config[key];
