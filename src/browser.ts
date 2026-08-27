import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const opener = (): { command: string; args: string[] } | undefined => {
  const override = process.env["BB_BROWSER"] ?? process.env["BROWSER"];
  if (override !== undefined && override !== "") {
    return { command: override, args: [] };
  }
  if (process.platform === "darwin") {
    return { command: "open", args: [] };
  }
  if (process.platform === "win32") {
    return { command: "cmd", args: ["/c", "start", ""] };
  }
  return { command: "xdg-open", args: [] };
};

/**
 * Opens a URL in the user's browser. Resolves false rather than throwing when there is
 * no way to do so — a headless box is an ordinary situation, not a failure.
 */
export const openBrowser = async (url: string): Promise<boolean> => {
  const target = opener();
  if (target === undefined) {
    return false;
  }
  try {
    await execFileAsync(target.command, [...target.args, url]);
    return true;
  } catch {
    return false;
  }
};
