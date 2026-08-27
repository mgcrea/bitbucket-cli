/** The list-based envelope: carries size, page and previous. */
export const fullEnvelope = <T>(values: T[], next?: string): Record<string, unknown> => ({
  size: 137,
  page: 1,
  pagelen: values.length,
  ...(next === undefined ? {} : { next }),
  values,
});

/**
 * The iterator-based envelope used by `/commits`: only values, pagelen and next, with
 * an opaque cursor in the `next` URL.
 */
export const minimalEnvelope = <T>(values: T[], next?: string): Record<string, unknown> => ({
  values,
  pagelen: values.length,
  ...(next === undefined ? {} : { next }),
});
