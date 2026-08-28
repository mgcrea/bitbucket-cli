import { BitbucketError, describeError } from "./http/errors.js";
import type { Io } from "./output/io.js";

/**
 * Exit codes. Distinct per failure class so scripts can branch without parsing text.
 */
export const EXIT = {
  ok: 0,
  generic: 1,
  usage: 2,
  notFound: 3,
  auth: 4,
  forbidden: 5,
  rateLimit: 6,
  network: 7,
  server: 8,
  gone: 10,
  interrupted: 130,
} as const;

const KIND_TO_EXIT: Record<string, number> = {
  auth: EXIT.auth,
  capability: EXIT.auth,
  forbidden: EXIT.forbidden,
  "not-found": EXIT.notFound,
  gone: EXIT.gone,
  "rate-limit": EXIT.rateLimit,
  network: EXIT.network,
  timeout: EXIT.network,
  server: EXIT.server,
  validation: EXIT.usage,
  context: EXIT.usage,
};

export class UsageError extends Error {
  override readonly name: string = "UsageError";
  constructor(
    message: string,
    readonly hint?: string,
  ) {
    super(message);
  }
}

/**
 * Formats an error to stderr and sets the exit code. Never writes to stdout, so a
 * failing command leaves a pipe clean rather than feeding it half a JSON document.
 */
export const reportError = (error: unknown, io: Io): void => {
  if (error instanceof UsageError) {
    io.error(error.message);
    if (error.hint !== undefined) {
      io.info(`  ${error.hint}`);
    }
    process.exitCode = EXIT.usage;
    return;
  }

  const described = describeError(error);
  io.error(described.title);

  if (described.fields !== undefined) {
    for (const [field, messages] of Object.entries(described.fields)) {
      io.info(`  ${field}: ${messages.join(", ")}`);
    }
  }
  if (described.hint !== undefined) {
    io.info(`  ${described.hint}`);
  }

  process.exitCode =
    error instanceof BitbucketError ? (KIND_TO_EXIT[described.kind] ?? EXIT.generic) : EXIT.generic;
};
