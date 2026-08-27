import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { createApiTokenAuth } from "../../src/auth/api-token.js";
import { createBitbucketClient } from "../../src/client/bitbucket-client.js";
import { USER_WORKSPACES } from "../../src/cloud/paths.js";
import { collect } from "../../src/pagination/collect.js";
import { fullEnvelope } from "../helpers/page.js";
import { server } from "../msw-server.js";

const BASE = "https://api.bitbucket.org/2.0";
const client = () => createBitbucketClient({ auth: createApiTokenAuth({ token: "t" }) });

describe("workspaces", () => {
  it("uses /user/workspaces", () => {
    // `GET /workspaces` and the cross-workspace `GET /repositories` were both removed
    // under CHANGE-2770, and `/user/permissions/workspaces` never existed. This is the
    // only remaining discovery endpoint, so the literal path is worth pinning.
    expect(USER_WORKSPACES).toBe("/user/workspaces");
  });

  it("unwraps the workspace_access envelope", async () => {
    server.use(
      http.get(`${BASE}/user/workspaces`, () =>
        HttpResponse.json(
          fullEnvelope([
            {
              type: "workspace_access",
              administrator: true,
              workspace: { type: "workspace_base", uuid: "{w}", slug: "rgisllc" },
            },
          ]),
        ),
      ),
    );
    const [workspace] = await collect(client().workspaces.list());
    expect(workspace).toMatchObject({ slug: "rgisllc", uuid: "{w}", isAdministrator: true });
  });

  it("defaults administrator to false when absent", async () => {
    server.use(
      http.get(`${BASE}/user/workspaces`, () =>
        HttpResponse.json(fullEnvelope([{ workspace: { slug: "acme" } }])),
      ),
    );
    const [workspace] = await collect(client().workspaces.list());
    expect(workspace?.isAdministrator).toBe(false);
  });
});
