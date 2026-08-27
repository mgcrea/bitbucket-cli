/**
 * Bitbucket's `fields=` partial-response mini-language.
 *
 * This is the single biggest performance lever the API offers, and one `gh` has no
 * equivalent for — GitHub's REST API has no partial-response parameter, so `gh` must
 * fetch whole objects and filter client-side. Here the server does the projection.
 *
 * Three forms, comma-separated in one parameter:
 *   -links                remove a key
 *   +reviewers            add a key the endpoint omits by default
 *   owner.display_name    whitelist (implicitly drops everything else)
 *
 * `fields=*` is field discovery: it reveals keys the endpoint does not return by default.
 */

/** Keys that carry the pagination envelope. Stripping any of them truncates silently. */
const ENVELOPE_KEYS = ["next", "page", "pagelen", "size"] as const;

export type FieldTerm = string;
export type FieldProjection = readonly FieldTerm[];

/**
 * A term that restricts the response to a subset. `*` is excluded: it is the discovery
 * wildcard, which *adds* normally-omitted fields rather than dropping anything, so it
 * never endangers the pagination keys.
 */
const isWhitelistTerm = (term: string): boolean =>
  term !== "*" && !term.startsWith("+") && !term.startsWith("-");

const assertValidTerm = (term: string): void => {
  if (term === "") {
    throw new TypeError("Field projection terms must not be empty");
  }
  // A pre-encoded `+` would be double-encoded by URLSearchParams into `%252B`.
  if (term.includes("%2B") || term.includes("%2b")) {
    throw new TypeError(
      `Field term ${JSON.stringify(term)} is already percent-encoded. Pass a literal "+".`,
    );
  }
  if (/[\s?&]/.test(term)) {
    throw new TypeError(`Field term ${JSON.stringify(term)} contains a reserved character`);
  }
};

/**
 * Joins terms into a raw, unencoded `fields` value.
 *
 * Deliberately returns the string with a literal `+`. Encoding is `buildUrl`'s job via
 * `URLSearchParams`, which turns it into `%2B`; an unencoded `+` on the wire decodes to
 * a space server-side and silently matches nothing.
 */
export const buildFields = (
  ...projections: readonly (FieldProjection | undefined)[]
): string | undefined => {
  const terms: string[] = [];
  for (const projection of projections) {
    for (const term of projection ?? []) {
      assertValidTerm(term);
      if (!terms.includes(term)) {
        terms.push(term);
      }
    }
  }
  return terms.length === 0 ? undefined : terms.join(",");
};

/**
 * Lifts a single-object projection onto a paginated envelope.
 *
 * On a collection the objects live under `values`, so `id` must become `values.id`,
 * while the same projection against `GET /pullrequests/{id}` stays `id`. Presets are
 * therefore authored once in single-object form and lifted here.
 *
 * Any whitelist projection also gets the envelope keys re-added. Without them a
 * whitelist strips `next`, which stops pagination after one page and looks like a short
 * result rather than an error — the worst failure mode available here. Doing it at this
 * chokepoint means no call site can get it wrong.
 */
export const forCollection = (projection: FieldProjection): FieldProjection => {
  const lifted = projection.map((term) => {
    if (term === "*") {
      return term;
    }
    if (term.startsWith("+") || term.startsWith("-")) {
      return `${term[0] ?? ""}values.${term.slice(1)}`;
    }
    return `values.${term}`;
  });
  return projection.some(isWhitelistTerm) ? [...ENVELOPE_KEYS, ...lifted] : lifted;
};
