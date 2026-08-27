import type { AuthStrategy } from "../auth/types.js";
import type { Flavor } from "../flavor/types.js";
import type { HttpClient } from "../http/http-client.js";
import { createPullRequestsResource } from "./pull-requests.js";
import { createRepositoriesResource } from "./repositories.js";
import { createUsersResource } from "./users.js";

export const createCloudFlavor = (http: HttpClient, auth: AuthStrategy): Flavor => ({
  id: "cloud",
  capabilities: {
    pipelines: true,
    serverSideQuery: true,
    fieldProjection: true,
    optimisticLocking: false,
  },
  auth,
  pullRequests: createPullRequestsResource(http),
  repositories: createRepositoriesResource(http),
  users: createUsersResource(http, auth),
});
