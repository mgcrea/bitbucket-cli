import type { WorkspaceSummary } from "../../flavor/domain.js";

/** `/user/workspaces` nests the workspace inside a `workspace_access` wrapper. */
type RawWorkspaceAccess = {
  administrator?: boolean;
  workspace?: { uuid?: string; slug?: string; name?: string; links?: { html?: { href?: string } } };
};

export const normalizeWorkspaceAccess = (raw: unknown): WorkspaceSummary => {
  const access = (raw ?? {}) as RawWorkspaceAccess;
  const workspace = access.workspace ?? {};
  return {
    slug: workspace.slug ?? "",
    name: workspace.name ?? workspace.slug ?? "",
    uuid: workspace.uuid,
    isAdministrator: access.administrator ?? false,
    url: workspace.links?.html?.href ?? `https://bitbucket.org/${workspace.slug ?? ""}/`,
  };
};
