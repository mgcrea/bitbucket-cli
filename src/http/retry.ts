export type RetryOptions = {
  /** Initial attempt included, so 3 means at most two retries. */
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  /**
   * Refuse to sit on a `Retry-After` longer than this. Bitbucket's rate-limit window is
   * an hour; blocking a CLI for an hour is worse than failing with a clear message.
   */
  maxRetryAfterMs: number;
  retryOn: readonly number[];
};

export const DEFAULT_RETRY: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 20_000,
  maxRetryAfterMs: 60_000,
  retryOn: [429, 500, 502, 503, 504],
};

/** `Retry-After` is either delta-seconds or an HTTP-date. Bitbucket sends seconds. */
export const parseRetryAfter = (value: string | null, now = Date.now()): number | undefined => {
  if (value === null) {
    return undefined;
  }
  const trimmed = value.trim();
  const seconds = Number.parseInt(trimmed, 10);
  if (Number.isFinite(seconds) && /^\d+$/.test(trimmed)) {
    return Math.max(0, seconds * 1000);
  }
  const date = Date.parse(trimmed);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
};

/**
 * Full jitter: a uniform draw from `[0, min(maxDelay, base * 2^attempt))`.
 *
 * Chosen over equal jitter because it spreads a retrying herd more evenly and is
 * trivial to test by pinning `Math.random`.
 */
export const computeDelay = (
  attempt: number,
  options: RetryOptions,
  retryAfterMs?: number,
  random: () => number = Math.random,
): number => {
  if (retryAfterMs !== undefined) {
    return retryAfterMs;
  }
  const ceiling = Math.min(options.maxDelayMs, options.baseDelayMs * 2 ** attempt);
  return Math.floor(random() * ceiling);
};

export const shouldRetryStatus = (status: number, options: RetryOptions): boolean =>
  options.retryOn.includes(status);

/**
 * A rejected request was never processed, so retrying it is always safe regardless of
 * method. Any other retryable status on a non-GET needs the caller to assert idempotence.
 */
export const isRetryableMethod = (method: string, status: number, idempotent: boolean): boolean =>
  status === 429 || method === "GET" || method === "HEAD" || idempotent;
