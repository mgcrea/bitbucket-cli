import { defineBbCommand } from "../../command.js";
import { type Config, readConfig, writeConfig } from "../../config/config.js";
import { isSettingKey, SETTING_KEYS, SETTINGS } from "../../config/settings.js";
import { UsageError } from "../../errors.js";
import { getRuntime } from "../../runtime.js";

export default defineBbCommand<never>({
  meta: { name: "set", description: "Change a setting" },
  args: {
    key: { type: "positional", description: "Setting name", required: true },
    value: { type: "positional", description: "New value, or empty to unset", required: false },
  },
  examples: [
    "bb config set git_protocol ssh",
    "bb config set default_workspace acme",
    "bb config set default_workspace ''",
  ],
  async run({ args }) {
    const { io } = getRuntime();
    const key = String(args["key"]);
    if (!isSettingKey(key)) {
      throw new UsageError(
        `Unknown setting ${JSON.stringify(key)}.`,
        `Known settings: ${SETTING_KEYS.join(", ")}.`,
      );
    }

    const value = args["value"] === undefined ? "" : String(args["value"]);
    const allowed = SETTINGS[key].values;
    if (value !== "" && allowed !== undefined && !allowed.includes(value)) {
      throw new UsageError(
        `${JSON.stringify(value)} is not a valid ${key}.`,
        `Valid values: ${allowed.join(", ")}.`,
      );
    }

    const config = await readConfig();
    const next: Config = { ...config };
    if (value === "") {
      // Deleted rather than written as an empty string, so the file stays a record of
      // what was deliberately chosen and `bb config list` can say "unset" honestly.
      delete next[key];
    } else if (key === "git_protocol") {
      // Narrowed per key rather than cast, so adding a setting with a union type
      // cannot silently write a value outside it.
      next.git_protocol = value === "ssh" ? "ssh" : "https";
    } else {
      next[key] = value;
    }
    await writeConfig(next);

    io.info(value === "" ? `Unset ${key}.` : `Set ${key} to ${value}.`);
    return { kind: "none" };
  },
});
