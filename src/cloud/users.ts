import type { AuthStrategy } from "../auth/types.js";
import type { Identity, UserRef } from "../flavor/domain.js";
import type { UsersResource } from "../flavor/types.js";
import { AuthenticationError, AuthorizationError, CapabilityError } from "../http/errors.js";
import type { HttpClient } from "../http/http-client.js";
import { normalizeUser } from "./normalize/user.js";
import * as paths from "./paths.js";

const NO_IDENTITY_HINT =
  "Repository, project and workspace access tokens are not tied to an Atlassian account, " +
  "so `GET /user` is unavailable. Run `bb auth login` with an API token, or pass " +
  "--workspace and --author explicitly.";

export const createUsersResource = (http: HttpClient, auth: AuthStrategy): UsersResource => ({
  /**
   * Fails before making a request when the credential structurally has no identity.
   * That avoids a wasted round trip and turns a bare 401 into an explanation.
   */
  async current(): Promise<UserRef> {
    if (!auth.capabilities.hasUserIdentity) {
      throw new CapabilityError("hasUserIdentity", auth.kind, NO_IDENTITY_HINT);
    }
    return normalizeUser(await http.request<unknown>({ path: paths.USER }));
  },

  /**
   * The non-throwing probe behind `bb auth status`.
   *
   * Degrades rather than throwing when a credential's declared type turns out to be
   * wrong, so a misconfigured token still produces a useful status line.
   */
  async whoami(): Promise<Identity> {
    if (auth.kind === "anonymous") {
      return { kind: "anonymous" };
    }
    if (!auth.capabilities.hasUserIdentity) {
      return { kind: "token", reason: "no-user-identity" };
    }
    try {
      return {
        kind: "user",
        user: normalizeUser(await http.request<unknown>({ path: paths.USER })),
      };
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
        return { kind: "token", reason: "no-user-identity" };
      }
      throw error;
    }
  },
});
