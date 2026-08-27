export const BASE_URL = "https://api.bitbucket.org/2.0";

/** Bitbucket rejects `pagelen` outside this range with `Invalid pagelen`. */
export const MIN_PAGE_LEN = 10;
export const MAX_PAGE_LEN = 100;
export const DEFAULT_PAGE_LEN = 50;

/** Guard against a server-side `next` loop. */
export const MAX_PAGES = 1000;

export const DEFAULT_TIMEOUT_MS = 30_000;
