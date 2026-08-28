import type { CommandNode } from "./tree.js";

export type Shell = "bash" | "zsh" | "fish" | "powershell";

export const SHELLS: readonly Shell[] = ["bash", "zsh", "fish", "powershell"];

const walk = (
  node: CommandNode,
  path: string[],
  visit: (node: CommandNode, path: string[]) => void,
): void => {
  visit(node, path);
  for (const child of node.children) {
    walk(child, [...path, child.name], visit);
  }
};

/** Single quotes would end the quoting in every shell here, so they are dropped. */
const clean = (text: string): string => text.replaceAll("'", "");

const wordsFor = (node: CommandNode): string[] => [
  ...node.children.map((child) => child.name),
  ...node.flags.map((flag) => `--${flag}`),
];

const bash = (root: CommandNode): string => {
  const cases: string[] = [];
  const paths: string[] = [];
  walk(root, [], (node, path) => {
    cases.push(`    "${path.join(" ")}") opts="${wordsFor(node).join(" ")}" ;;`);
    if (path.length > 0) {
      paths.push(`"${path.join(" ")}"`);
    }
  });

  return [
    "# bb bash completion.",
    '# Load with: eval "$(bb completion -s bash)"',
    "",
    "_bb_is_path() {",
    '  case "$1" in',
    `    ${paths.join("|")}) return 0 ;;`,
    "    *) return 1 ;;",
    "  esac",
    "}",
    "",
    "_bb_completion() {",
    "  local cur key candidate word i opts",
    "  COMPREPLY=()",
    '  cur="${COMP_WORDS[COMP_CWORD]}"',
    "",
    "  # Extend the subcommand path only while it stays a real path. That skips flags",
    "  # and, crucially, their values: `--limit 5` must not make `5` look like a",
    "  # subcommand and strand every completion after it.",
    '  key=""',
    "  for ((i = 1; i < COMP_CWORD; i++)); do",
    '    word="${COMP_WORDS[i]}"',
    '    case "$word" in -*) continue ;; esac',
    '    candidate="${key:+$key }$word"',
    '    if _bb_is_path "$candidate"; then key="$candidate"; fi',
    "  done",
    "",
    '  case "$key" in',
    ...cases,
    '    *) opts="" ;;',
    "  esac",
    "",
    "  # Word splitting is intended here. `mapfile` would be tidier but is bash 4+,",
    "  # and macOS still ships bash 3.2.",
    "  # shellcheck disable=SC2207",
    '  COMPREPLY=( $(compgen -W "$opts" -- "$cur") )',
    "}",
    "complete -F _bb_completion bb",
    "",
  ].join("\n");
};

const zsh = (root: CommandNode): string => {
  const cases: string[] = [];
  const paths: string[] = [];
  walk(root, [], (node, path) => {
    const describe = node.children
      .map((child) => `'${child.name}:${clean(child.description)}'`)
      .join(" ");
    const flags = node.flags.map((flag) => `'--${flag}'`).join(" ");
    cases.push(`    "${path.join(" ")}") _values 'option' ${describe} ${flags} ;;`);
    if (path.length > 0) {
      paths.push(`"${path.join(" ")}"`);
    }
  });

  return [
    "#compdef bb",
    "# bb zsh completion.",
    '# Load with: eval "$(bb completion -s zsh)"',
    "",
    "_bb_is_path() {",
    '  case "$1" in',
    `    ${paths.join("|")}) return 0 ;;`,
    "    *) return 1 ;;",
    "  esac",
    "}",
    "",
    "_bb_completion() {",
    "  local key candidate word i",
    '  key=""',
    "  # Extend only while the path stays real, so a flag value is never mistaken",
    "  # for a subcommand.",
    "  for ((i = 2; i < CURRENT; i++)); do",
    '    word="${words[i]}"',
    '    case "$word" in -*) continue ;; esac',
    '    candidate="${key:+$key }$word"',
    '    if _bb_is_path "$candidate"; then key="$candidate"; fi',
    "  done",
    "",
    '  case "$key" in',
    ...cases,
    "  esac",
    "}",
    "compdef _bb_completion bb",
    "",
  ].join("\n");
};

const fish = (root: CommandNode): string => {
  const lines = ["# bb fish completion.", "# Load with: bb completion -s fish | source", ""];
  walk(root, [], (node, path) => {
    // fish matches on the deepest subcommand seen, so nesting deeper than one level
    // shares a condition. Good enough, and it keeps the script readable.
    const condition =
      path.length === 0
        ? "__fish_use_subcommand"
        : `__fish_seen_subcommand_from ${path.at(-1) ?? ""}`;
    for (const child of node.children) {
      lines.push(
        `complete -c bb -n '${condition}' -a '${child.name}' -d '${clean(child.description)}'`,
      );
    }
    for (const flag of node.flags) {
      lines.push(`complete -c bb -n '${condition}' -l '${flag}'`);
    }
  });
  return `${lines.join("\n")}\n`;
};

const powershell = (root: CommandNode): string => {
  const entries: string[] = [];
  walk(root, [], (node, path) => {
    const words = wordsFor(node)
      .map((word) => `'${word}'`)
      .join(", ");
    entries.push(`    '${path.join(" ")}' = @(${words})`);
  });

  return [
    "# bb PowerShell completion.",
    "# Load with: bb completion -s powershell | Out-String | Invoke-Expression",
    "Register-ArgumentCompleter -Native -CommandName bb -ScriptBlock {",
    "  param($wordToComplete, $commandAst, $cursorPosition)",
    "  $table = @{",
    ...entries,
    "  }",
    "  $words = $commandAst.CommandElements | Select-Object -Skip 1 |",
    "    Where-Object { $_ -notlike '-*' } | ForEach-Object { $_.ToString() }",
    "  $options = $table[($words -join ' ')]",
    "  if ($null -eq $options) { $options = @() }",
    '  $options | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {',
    "    [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)",
    "  }",
    "}",
    "",
  ].join("\n");
};

export const generateCompletion = (shell: Shell, root: CommandNode): string => {
  switch (shell) {
    case "bash":
      return bash(root);
    case "zsh":
      return zsh(root);
    case "fish":
      return fish(root);
    case "powershell":
      return powershell(root);
  }
};
