import type { WorkspaceSummary } from "../flavor/domain.js";
import type { WorkspacesResource } from "../flavor/types.js";
import type { HttpClient } from "../http/http-client.js";
import type { PaginateOptions } from "../pagination/paginate.js";
import { paginate } from "../pagination/paginate.js";
import { normalizeWorkspaceAccess } from "./normalize/workspace.js";
import * as paths from "./paths.js";

export const createWorkspacesResource = (http: HttpClient): WorkspacesResource => ({
  list(options: PaginateOptions = {}): AsyncIterable<WorkspaceSummary> {
    const source = paginate<unknown>(http, { path: paths.USER_WORKSPACES }, options);
    return (async function* map(): AsyncGenerator<WorkspaceSummary> {
      for await (const raw of source) {
        yield normalizeWorkspaceAccess(raw);
      }
    })();
  },
});
