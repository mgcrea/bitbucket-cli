import { createAccessTokenAuth } from "./access-token.js";
import { createAnonymousAuth } from "./anonymous.js";
import { createApiTokenAuth } from "./api-token.js";
import type { AuthStrategy } from "./types.js";

const env = (name: string): string | undefined => {
  const value = process.env[name];
  return value === undefined || value === "" ? undefined : value;
};

/** `BB_*` is primary; the longer `BITBUCKET_*` spelling is accepted as an alias. */
const read = (...names: readonly string[]): { value: string; source: string } | undefined => {
  for (const name of names) {
    const value = env(name);
    if (value !== undefined) {
      return { value, source: name };
    }
  }
  return undefined;
};

/**
 * Builds a credential from the environment.
 *
 * A bare token string cannot be told apart by inspection — an Atlassian API token and a
 * repository access token look alike but behave differently and need different headers.
 * So the *type is declared, never sniffed*: which variable the token arrives in is the
 * declaration. `BB_TOKEN_TYPE` overrides when a caller needs to be explicit.
 *
 * Environment credentials always win over stored ones and are never written to disk,
 * which is what makes CI work with no setup step.
 */
export const resolveAuthFromEnv = (): AuthStrategy => {
  const accessToken = read("BB_ACCESS_TOKEN", "BITBUCKET_ACCESS_TOKEN");
  if (accessToken !== undefined) {
    return createAccessTokenAuth({ token: accessToken.value, source: accessToken.source });
  }

  const token = read("BB_TOKEN", "BITBUCKET_TOKEN", "BB_API_TOKEN", "BITBUCKET_API_TOKEN");
  if (token === undefined) {
    return createAnonymousAuth();
  }

  const declaredType = env("BB_TOKEN_TYPE");
  if (declaredType === "access-token") {
    return createAccessTokenAuth({ token: token.value, source: token.source });
  }

  const email = read("BB_EMAIL", "BITBUCKET_EMAIL");
  return createApiTokenAuth({
    token: token.value,
    email: email?.value,
    transport: email === undefined ? "bearer" : "basic",
    username: env("BB_USERNAME"),
    source: token.source,
  });
};
