import { formatWithOptions } from "node:util";

export type DebugScope = "api" | "auth" | "git" | "paginate" | "alias";

const scopesFromEnv = (): Set<string> => {
  const raw = process.env["BB_DEBUG"] ?? "";
  return new Set(
    raw
      .split(",")
      .map((scope) => scope.trim())
      .filter((scope) => scope !== ""),
  );
};

export const isDebugEnabled = (scope: DebugScope): boolean => {
  const scopes = scopesFromEnv();
  return scopes.has("*") || scopes.has(scope);
};

/**
 * Masks credentials in anything headed for a log or an error message.
 *
 * Covers `Authorization` header values, userinfo embedded in a clone URL
 * (`https://x-token-auth:SECRET@…`) and the query parameters OAuth puts secrets in.
 */
export const redact = (value: string): string =>
  value
    .replace(/(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 «redacted»")
    .replace(/\/\/([^/@:]+):([^/@]+)@/g, "//$1:«redacted»@")
    .replace(/\b(access_token|refresh_token|client_secret|code|token)=[^&\s]+/gi, "$1=«redacted»");

/**
 * Debug output goes to stderr, never stdout — `bb pr list --json | jq` must never see it.
 */
export const createDebug =
  (scope: DebugScope) =>
  (message: string, data?: unknown): void => {
    if (!isDebugEnabled(scope)) {
      return;
    }
    const rendered =
      data === undefined
        ? ""
        : ` ${formatWithOptions({ depth: 6, colors: process.stderr.isTTY === true }, data)}`;
    process.stderr.write(`bb:${scope} ${redact(message)}${redact(rendered)}\n`);
  };
