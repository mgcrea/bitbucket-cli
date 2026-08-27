import type { FieldProjection } from "./projection.js";

/**
 * Per-resource projections, authored in single-object form and lifted by
 * `forCollection()` at the call site.
 *
 * `list` carries exactly what the default table renders; `wide` is everything minus the
 * link soup, for `--json`. Note these use additive and subtractive terms rather than a
 * whitelist: on a collection a whitelist is only safe because `forCollection` re-adds
 * the envelope keys, and staying subtractive avoids relying on that entirely.
 */
export const PULL_REQUEST_FIELDS = {
  list: [
    "-links",
    "-description",
    "-summary",
    "-rendered",
    "-source.repository.links",
    "-destination.repository.links",
  ],
  wide: ["-rendered", "+reviewers", "+participants"],
  ref: ["id", "title", "state"],
} as const satisfies Record<string, FieldProjection>;

export const REPOSITORY_FIELDS = {
  list: ["-links", "-description", "-owner.links", "-project.links", "-mainbranch.links"],
  // Deliberately keeps `links`: the clone URLs live under `links.clone`, and `bb repo
  // clone` reads them from a `get()`. Stripping them here made cloning impossible.
  wide: [],
  ref: ["uuid", "full_name", "slug"],
} as const satisfies Record<string, FieldProjection>;

export type FieldPreset = "list" | "wide" | "ref";
