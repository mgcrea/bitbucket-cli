import type { LocalCommit } from "./log.js";

export type PullRequestDraft = {
  title: string;
  description: string;
  commitCount: number;
};

/** `feature/add-oauth-support` -> `Add oauth support`. */
const humanizeBranch = (branch: string): string => {
  const tail = branch.split("/").at(-1) ?? branch;
  const words = tail.replace(/[-_]+/g, " ").trim();
  return words === "" ? branch : words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * Composes a pull-request title and body from the commits on the branch.
 *
 * A single commit is almost always self-describing, so its subject and body are used
 * verbatim. Several commits get the branch name as a title and a bulleted list of
 * subjects, which reads better than an arbitrary commit's subject.
 *
 * Pure over its inputs, which is why it lives here rather than in the CLI: the git
 * reads are the awkward part and they stay in `log.ts`.
 */
export const buildPullRequestDraft = (
  commits: readonly LocalCommit[],
  branch: string,
): PullRequestDraft => {
  if (commits.length === 0) {
    return { title: humanizeBranch(branch), description: "", commitCount: 0 };
  }

  // `git log` is newest-first; a changelog reads oldest-first.
  const ordered = commits.toReversed();

  if (ordered.length === 1) {
    const only = ordered[0];
    return {
      title: only?.subject ?? humanizeBranch(branch),
      description: only?.body ?? "",
      commitCount: 1,
    };
  }

  return {
    title: humanizeBranch(branch),
    description: ordered.map((commit) => `- ${commit.subject}`).join("\n"),
    commitCount: ordered.length,
  };
};
