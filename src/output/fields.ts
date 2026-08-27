import type { FieldProjection } from "../fields/projection.js";

/**
 * Declares one `--json` field: the API paths needed to populate it, and how to pick it
 * off a domain object.
 *
 * Keeping both halves next to the command means the advertised field list, the
 * server-side `fields=` projection, and the emitted JSON cannot drift apart.
 */
export type FieldSpec<T> = {
  /** `fields=` terms this key needs. Unioned across every selected key. */
  api?: FieldProjection | undefined;
  pick: (row: T) => unknown;
};

export type FieldMap<T> = Record<string, FieldSpec<T>>;

export const availableFields = <T>(map: FieldMap<T>): string[] => Object.keys(map).toSorted();

const levenshtein = (a: string, b: string): number => {
  const rows = Array.from({ length: a.length + 1 }, () =>
    Array.from<number>({ length: b.length + 1 }).fill(0),
  );
  for (let i = 0; i <= a.length; i += 1) rows[i]![0] = i;
  for (let j = 0; j <= b.length; j += 1) rows[0]![j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i]![j] = Math.min(
        rows[i - 1]![j]! + 1,
        rows[i]![j - 1]! + 1,
        rows[i - 1]![j - 1]! + cost,
      );
    }
  }
  return rows[a.length]![b.length]!;
};

const didYouMean = (unknown: string, candidates: readonly string[]): string | undefined => {
  const ranked = candidates
    .map((candidate) => ({ candidate, distance: levenshtein(unknown, candidate) }))
    .toSorted((a, b) => a.distance - b.distance);
  const best = ranked[0];
  return best !== undefined && best.distance <= 3 ? best.candidate : undefined;
};

export class UnknownFieldError extends Error {
  override readonly name = "UnknownFieldError";
  constructor(
    readonly field: string,
    readonly available: readonly string[],
  ) {
    const suggestion = didYouMean(field, available);
    super(
      `Unknown JSON field ${JSON.stringify(field)}.` +
        (suggestion === undefined ? "" : ` Did you mean ${JSON.stringify(suggestion)}?`) +
        `\nAvailable: ${available.join(", ")}`,
    );
  }
}

export const parseFieldSelection = <T>(raw: string, map: FieldMap<T>): string[] => {
  const available = availableFields(map);
  const selected = raw
    .split(",")
    .map((field) => field.trim())
    .filter((field) => field !== "");

  for (const field of selected) {
    if (map[field] === undefined) {
      throw new UnknownFieldError(field, available);
    }
  }
  return selected;
};

/** The union of `fields=` terms needed to populate the selected keys. */
export const projectionFor = <T>(
  selected: readonly string[],
  map: FieldMap<T>,
): FieldProjection => {
  const terms: string[] = [];
  for (const key of selected) {
    for (const term of map[key]?.api ?? []) {
      if (!terms.includes(term)) {
        terms.push(term);
      }
    }
  }
  return terms;
};

export const pickFields = <T>(
  row: T,
  selected: readonly string[],
  map: FieldMap<T>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const key of selected) {
    const spec = map[key];
    if (spec !== undefined) {
      result[key] = spec.pick(row);
    }
  }
  return result;
};
