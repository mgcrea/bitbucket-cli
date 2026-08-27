/**
 * Rate-limit header parsing.
 *
 * Every field here is independently optional. Atlassian documents that these headers
 * are "not necessarily returned on every response", and only `X-RateLimit-Limit`,
 * `-Resource` and `-NearLimit` are documented at all — `remaining` and `reset` are
 * observed in practice but undocumented. Nothing may depend on their presence.
 */

export type RateLimitSnapshot = {
  /** Total permitted per window, not the remainder. */
  limit?: number | undefined;
  /** Window length in seconds. */
  window?: number | undefined;
  remaining?: number | undefined;
  resetAt?: Date | undefined;
  /** Atlassian sets this once less than 20% of the quota remains. */
  nearLimit: boolean;
  observedAt: Date;
};

const toInt = (value: string | null | undefined): number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * `X-RateLimit-Limit` uses RateLimit-policy syntax, e.g. `"60, 60;w=3600"`: a quota,
 * then one or more policy segments carrying the window in `;w=`.
 */
const parseLimitPolicy = (
  raw: string | null,
): { limit?: number | undefined; window?: number | undefined } => {
  if (raw === null) {
    return {};
  }
  const segments = raw.split(",").map((segment) => segment.trim());
  const limit = toInt(segments[0]);
  let window: number | undefined;
  for (const segment of segments) {
    const match = /;\s*w\s*=\s*(\d+)/.exec(segment);
    if (match?.[1] !== undefined) {
      window = toInt(match[1]);
      break;
    }
  }
  return {
    ...(limit === undefined ? {} : { limit }),
    ...(window === undefined ? {} : { window }),
  };
};

/**
 * `x-ratelimit-reset` is undocumented and ambiguous: it may be seconds remaining or an
 * absolute epoch. Values above ~2001 in epoch seconds are certainly absolute, and a
 * "seconds remaining" of a billion is nonsensical, so the threshold separates them
 * safely.
 */
const parseReset = (raw: string | null, now: number): Date | undefined => {
  const value = toInt(raw);
  if (value === undefined) {
    return undefined;
  }
  return value > 1e9 ? new Date(value * 1000) : new Date(now + value * 1000);
};

export const parseRateLimit = (headers: Headers): RateLimitSnapshot | undefined => {
  const now = Date.now();
  const { limit, window } = parseLimitPolicy(headers.get("x-ratelimit-limit"));
  const remaining = toInt(headers.get("x-ratelimit-remaining"));
  const resetAt = parseReset(headers.get("x-ratelimit-reset"), now);
  const nearLimit = headers.get("x-ratelimit-nearlimit")?.toLowerCase() === "true";

  // Return undefined rather than an empty shell so `onRateLimit` is not fired with
  // nothing in it on the many responses that carry no rate-limit headers at all.
  if (
    limit === undefined &&
    remaining === undefined &&
    resetAt === undefined &&
    window === undefined &&
    !nearLimit
  ) {
    return undefined;
  }

  return {
    ...(limit === undefined ? {} : { limit }),
    ...(window === undefined ? {} : { window }),
    ...(remaining === undefined ? {} : { remaining }),
    ...(resetAt === undefined ? {} : { resetAt }),
    nearLimit,
    observedAt: new Date(now),
  };
};
