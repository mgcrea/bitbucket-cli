import type { RateLimitSnapshot } from "./rate-limit.js";

/** Bitbucket's error envelope. `error` is occasionally absent on gateway responses. */
export type BitbucketErrorEnvelope = {
  type: "error";
  error?:
    | {
        message?: string | undefined;
        detail?: string | undefined;
        fields?: Record<string, string[]> | undefined;
        id?: string | undefined;
      }
    | undefined;
};

export type BitbucketErrorKind =
  | "auth"
  | "forbidden"
  | "not-found"
  | "gone"
  | "conflict"
  | "validation"
  | "rate-limit"
  | "server"
  | "network"
  | "timeout"
  | "capability"
  | "parse"
  | "git"
  | "context"
  | "unknown";

export type ApiErrorContext = {
  status: number;
  method: string;
  /** Already passed through `redact()`. Safe to log. */
  url: string;
  envelope?: BitbucketErrorEnvelope | undefined;
  requestId?: string | undefined;
  rateLimit?: RateLimitSnapshot | undefined;
};

export abstract class BitbucketError extends Error {
  abstract readonly kind: BitbucketErrorKind;
  /** An actionable next step. The CLI renders this verbatim. */
  readonly hint?: string | undefined;

  constructor(message: string, options?: { cause?: unknown; hint?: string | undefined }) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.hint = options?.hint;
  }
}

export class BitbucketApiError extends BitbucketError {
  override readonly name: string = "BitbucketApiError";
  readonly kind: BitbucketErrorKind = "unknown";

  constructor(
    readonly context: ApiErrorContext,
    options?: { message?: string | undefined; hint?: string | undefined },
  ) {
    const detail = context.envelope?.error?.detail;
    const message =
      options?.message ??
      context.envelope?.error?.message ??
      `${context.method} ${context.url} failed with HTTP ${context.status}`;
    super(detail === undefined ? message : `${message}: ${detail}`, { hint: options?.hint });
  }

  get status(): number {
    return this.context.status;
  }

  get detail(): string | undefined {
    return this.context.envelope?.error?.detail;
  }

  /** Per-field validation messages, when the API supplied them. */
  get fields(): Record<string, string[]> | undefined {
    return this.context.envelope?.error?.fields;
  }
}

export class AuthenticationError extends BitbucketApiError {
  override readonly name = "AuthenticationError";
  override readonly kind: BitbucketErrorKind = "auth";
}

export class AuthorizationError extends BitbucketApiError {
  override readonly name = "AuthorizationError";
  override readonly kind: BitbucketErrorKind = "forbidden";
}

export class NotFoundError extends BitbucketApiError {
  override readonly name = "NotFoundError";
  override readonly kind: BitbucketErrorKind = "not-found";
}

export class GoneError extends BitbucketApiError {
  override readonly name = "GoneError";
  override readonly kind: BitbucketErrorKind = "gone";
}

export class ConflictError extends BitbucketApiError {
  override readonly name = "ConflictError";
  override readonly kind: BitbucketErrorKind = "conflict";
}

export class ValidationError extends BitbucketApiError {
  override readonly name = "ValidationError";
  override readonly kind: BitbucketErrorKind = "validation";
}

export class RateLimitError extends BitbucketApiError {
  override readonly name = "RateLimitError";
  override readonly kind: BitbucketErrorKind = "rate-limit";

  constructor(
    context: ApiErrorContext,
    readonly retryAfterMs: number | undefined,
    options?: { message?: string | undefined; hint?: string | undefined },
  ) {
    super(context, options);
  }
}

export class ServerError extends BitbucketApiError {
  override readonly name = "ServerError";
  override readonly kind: BitbucketErrorKind = "server";
}

export class NetworkError extends BitbucketError {
  override readonly name = "NetworkError";
  readonly kind: BitbucketErrorKind = "network";
}

export class TimeoutError extends BitbucketError {
  override readonly name = "TimeoutError";
  readonly kind: BitbucketErrorKind = "timeout";
}

export class ResponseParseError extends BitbucketError {
  override readonly name = "ResponseParseError";
  readonly kind: BitbucketErrorKind = "parse";
}

export class GitError extends BitbucketError {
  override readonly name = "GitError";
  readonly kind: BitbucketErrorKind = "git";
}

export class RepoContextError extends BitbucketError {
  override readonly name = "RepoContextError";
  readonly kind: BitbucketErrorKind = "context";
}

/**
 * Raised before any request is made when the active credential structurally cannot
 * perform an operation — most often a repository/project/workspace access token, which
 * has no associated Atlassian account and therefore no `GET /user`.
 *
 * Failing here rather than at the API boundary avoids a wasted round trip and turns a
 * confusing 401 into an explanation.
 */
export class CapabilityError extends BitbucketError {
  override readonly name = "CapabilityError";
  readonly kind: BitbucketErrorKind = "capability";

  constructor(
    readonly capability: string,
    readonly authKind: string,
    hint: string,
  ) {
    const article = /^[aeiou]/i.test(authKind) ? "an" : "a";
    super(`This operation is not available with ${article} ${authKind} credential`, { hint });
  }
}

const STATUS_ERRORS: Record<number, typeof BitbucketApiError> = {
  400: ValidationError,
  401: AuthenticationError,
  403: AuthorizationError,
  404: NotFoundError,
  409: ConflictError,
  410: GoneError,
};

/** Hints for the endpoints Atlassian has already removed. */
const goneHint = (url: string): string =>
  /\/issues(\/|\?|$)/.test(url)
    ? "Bitbucket removed the issue tracker API. There is no replacement; use Jira."
    : /\/2\.0\/repositories(\/)?(\?|$)/.test(url)
      ? "Listing repositories across all workspaces was removed. Pass a workspace."
      : "This endpoint has been removed by Atlassian.";

export const errorForStatus = (
  context: ApiErrorContext,
  retryAfterMs?: number,
): BitbucketApiError => {
  if (context.status === 429) {
    return new RateLimitError(context, retryAfterMs, {
      hint: "Slow down, or authenticate to raise the quota.",
    });
  }
  if (context.status === 410) {
    return new GoneError(context, { hint: goneHint(context.url) });
  }
  if (context.status >= 500) {
    return new ServerError(context);
  }
  const Ctor = STATUS_ERRORS[context.status];
  return Ctor === undefined
    ? new BitbucketApiError(context)
    : new (Ctor as new (c: ApiErrorContext) => BitbucketApiError)(context);
};

/** A flat, render-ready view of any error. The CLI owns the exit-code mapping. */
export const describeError = (
  error: unknown,
): {
  kind: BitbucketErrorKind;
  title: string;
  detail?: string | undefined;
  hint?: string | undefined;
  fields?: Record<string, string[]> | undefined;
} => {
  if (error instanceof BitbucketApiError) {
    return {
      kind: error.kind,
      title: error.message,
      detail: error.detail,
      hint: error.hint,
      fields: error.fields,
    };
  }
  if (error instanceof BitbucketError) {
    return { kind: error.kind, title: error.message, hint: error.hint };
  }
  return {
    kind: "unknown",
    title: error instanceof Error ? error.message : String(error),
  };
};
