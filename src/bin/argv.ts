export type PreparedArgv = {
  /** Arguments citty should parse. */
  argv: string[];
  /** Everything after the first literal `--`. */
  passthrough: string[];
};

/**
 * Works around two things citty's parser does that we cannot live with.
 *
 * First, citty forwards `--` to `node:util.parseArgs`, which flattens everything after
 * it into `_` with no boundary marker — so `bb pr checkout 42 -- --force` loses the
 * separation. We split it off ourselves before citty ever sees it.
 *
 * Second, `--json` is a string flag, so `bb pr list --json --limit 5` would parse
 * `json` as `"--limit"`. But bare `--json` listing the available fields is worth
 * keeping, so a bare occurrence is rewritten to `--json=` and the empty string becomes
 * the sentinel. `--jq` and `--template` genuinely require a value and are left to error.
 */
export const prepareArgv = (raw: readonly string[]): PreparedArgv => {
  const separator = raw.indexOf("--");
  const argv = separator === -1 ? [...raw] : raw.slice(0, separator);
  const passthrough = separator === -1 ? [] : raw.slice(separator + 1);

  const rewritten = argv.map((argument, index) => {
    if (argument !== "--json") {
      return argument;
    }
    const next = argv[index + 1];
    const bare = next === undefined || next.startsWith("-");
    return bare ? "--json=" : argument;
  });

  return { argv: rewritten, passthrough: [...passthrough] };
};
