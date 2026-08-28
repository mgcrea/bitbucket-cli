import { defineBbCommand } from "../../command.js";
import { readConfig } from "../../config/config.js";
import { isSettingKey, readSetting, SETTING_KEYS } from "../../config/settings.js";
import { UsageError } from "../../errors.js";

export default defineBbCommand<never>({
  meta: { name: "get", description: "Print the value of one setting" },
  args: {
    key: { type: "positional", description: "Setting name", required: true },
  },
  examples: ["bb config get git_protocol"],
  async run({ args }) {
    const key = String(args["key"]);
    if (!isSettingKey(key)) {
      throw new UsageError(
        `Unknown setting ${JSON.stringify(key)}.`,
        `Known settings: ${SETTING_KEYS.join(", ")}.`,
      );
    }

    const value = readSetting(await readConfig(), key);
    // An unset setting is not an error — it prints nothing and exits 0, so
    // `[ -z "$(bb config get git_protocol)" ]` works in a script.
    return { kind: "text", text: value ?? "" };
  },
});
