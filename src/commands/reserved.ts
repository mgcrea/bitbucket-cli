/**
 * Top-level command names an alias may never take.
 *
 * Kept as a plain list rather than derived from the command tree, because resolving
 * that tree means loading every subcommand module — which is exactly the startup cost
 * the lazy imports exist to avoid. A spec asserts the two stay in step.
 */
export const RESERVED_NAMES: readonly string[] = [
  "alias",
  "api",
  "auth",
  "browse",
  "completion",
  "config",
  "issue",
  "pipeline",
  "pr",
  "repo",
  "workspace",
];
