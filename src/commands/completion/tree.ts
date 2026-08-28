import type { ArgsDef, CommandDef } from "citty";

export type CommandNode = {
  name: string;
  description: string;
  /** Long-form flags, without the leading dashes. */
  flags: string[];
  children: CommandNode[];
};

type Resolvable<T> = T | Promise<T> | (() => T | Promise<T>);

const resolve = async <T>(value: Resolvable<T> | undefined): Promise<T | undefined> =>
  typeof value === "function" ? await (value as () => T | Promise<T>)() : await value;

/**
 * Walks the command tree so completions are generated from the same definitions that
 * dispatch, rather than from a hand-maintained list that would drift.
 *
 * Subcommands are lazy factories, so this resolves all of them — fine here, because
 * generating completions is a one-off rather than something on the startup path.
 */
export const buildCommandTree = async (command: CommandDef, name: string): Promise<CommandNode> => {
  const meta = await resolve(command.meta);
  const args = ((await resolve(command.args)) ?? {}) as ArgsDef;
  const subCommands = ((await resolve(command.subCommands)) ?? {}) as Record<
    string,
    Resolvable<CommandDef>
  >;

  const flags = Object.entries(args)
    .filter(([, definition]) => definition?.type !== "positional")
    .map(([flag]) => flag)
    .toSorted();

  const children: CommandNode[] = [];
  for (const [childName, child] of Object.entries(subCommands)) {
    const resolved = await resolve(child);
    if (resolved === undefined) {
      continue;
    }
    const childMeta = await resolve(resolved.meta);
    // Hidden commands exist for git to call, not for a person to complete.
    if (childMeta?.hidden === true) {
      continue;
    }
    children.push(await buildCommandTree(resolved, childName));
  }

  return { name, description: meta?.description ?? "", flags, children };
};
