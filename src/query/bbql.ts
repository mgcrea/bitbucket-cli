/**
 * Bitbucket Query Language.
 *
 * Operators: `= != ~ !~ > >= < <=`, `IN`, `NOT IN`, combined with `AND` / `OR` and
 * parentheses. Field paths traverse nested objects (`source.repository.full_name`) and
 * are NOT prefixed with `values.` — that prefix belongs to `fields=`, not to `q=`.
 */

/**
 * Quotes a value for interpolation into a BBQL expression.
 *
 * CLI flags such as `--search` and `--author` end up inside `q=`, so without escaping
 * a title containing a double quote would let a user close the string and inject
 * arbitrary clauses.
 */
export const quoteBbql = (value: string): string => `"${value.replace(/(["\\])/g, "\\$1")}"`;

export type BbqlClause = string;

export const eq = (field: string, value: string): BbqlClause => `${field} = ${quoteBbql(value)}`;

export const contains = (field: string, value: string): BbqlClause =>
  `${field} ~ ${quoteBbql(value)}`;

export const inList = (field: string, values: readonly string[]): BbqlClause =>
  `${field} IN (${values.map(quoteBbql).join(", ")})`;

/** Joins clauses with AND, dropping empties. Returns undefined when nothing is left. */
export const and = (...clauses: readonly (BbqlClause | undefined)[]): string | undefined => {
  const present = clauses.filter(
    (clause): clause is string => clause !== undefined && clause !== "",
  );
  if (present.length === 0) {
    return undefined;
  }
  return present.map((clause) => (present.length > 1 ? `(${clause})` : clause)).join(" AND ");
};
