/**
 * Collects every occurrence of a repeatable flag from the raw argv.
 *
 * citty's arg types are boolean, string, enum and positional — none of which express
 * "may be given more than once", so a repeated flag collapses to its last value. `bb
 * api -f a=1 -f b=2` would silently lose `a=1`. Reading them straight from argv is the
 * only way to honour the documented repeatability.
 *
 * Handles both `--flag value` and `--flag=value`, and short `-f value` / `-fvalue`.
 */
export const collectRepeated = (rawArgs: readonly string[], names: readonly string[]): string[] => {
  const long = names.filter((name) => name.length > 1).map((name) => `--${name}`);
  const short = names.filter((name) => name.length === 1).map((name) => `-${name}`);
  const values: string[] = [];

  for (let index = 0; index < rawArgs.length; index += 1) {
    const argument = rawArgs[index];
    if (argument === undefined) {
      continue;
    }

    const matchedLong = long.find((flag) => argument === flag || argument.startsWith(`${flag}=`));
    if (matchedLong !== undefined) {
      if (argument === matchedLong) {
        const next = rawArgs[index + 1];
        if (next !== undefined) {
          values.push(next);
          index += 1;
        }
      } else {
        values.push(argument.slice(matchedLong.length + 1));
      }
      continue;
    }

    const matchedShort = short.find((flag) => argument === flag || argument.startsWith(flag));
    if (matchedShort !== undefined && argument.startsWith("-") && !argument.startsWith("--")) {
      if (argument === matchedShort) {
        const next = rawArgs[index + 1];
        if (next !== undefined) {
          values.push(next);
          index += 1;
        }
      } else {
        values.push(argument.slice(matchedShort.length).replace(/^=/, ""));
      }
    }
  }

  return values;
};
