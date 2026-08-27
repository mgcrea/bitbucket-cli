import type { ForkPolicy, Repository, RepositorySummary } from "../../flavor/domain.js";

type RawCloneLink = { name?: string; href?: string };

type RawRepository = {
  uuid?: string;
  name?: string;
  slug?: string;
  full_name?: string;
  is_private?: boolean;
  description?: string;
  language?: string;
  size?: number;
  created_on?: string;
  updated_on?: string;
  fork_policy?: string;
  mainbranch?: { name?: string };
  workspace?: { slug?: string };
  project?: { key?: string; name?: string };
  links?: { html?: { href?: string }; clone?: RawCloneLink[] };
};

const splitFullName = (fullName: string | undefined): { workspace: string; slug: string } => {
  const [workspace = "", slug = ""] = (fullName ?? "").split("/");
  return { workspace, slug };
};

export const normalizeRepositorySummary = (raw: unknown): RepositorySummary => {
  const repo = (raw ?? {}) as RawRepository;
  const parts = splitFullName(repo.full_name);
  return {
    workspace: repo.workspace?.slug ?? parts.workspace,
    slug: repo.slug ?? parts.slug,
    fullName: repo.full_name ?? "",
    uuid: repo.uuid,
    isPrivate: repo.is_private ?? true,
    description: repo.description,
    language: repo.language === "" ? undefined : repo.language,
    mainBranch: repo.mainbranch?.name,
    updatedAt: repo.updated_on,
    url: repo.links?.html?.href ?? "",
  };
};

export const normalizeRepository = (raw: unknown): Repository => {
  const repo = (raw ?? {}) as RawRepository;
  const clone = repo.links?.clone ?? [];
  const byName = (name: string): string | undefined =>
    clone.find((link) => link.name === name)?.href;

  return {
    ...normalizeRepositorySummary(raw),
    createdAt: repo.created_on,
    size: repo.size,
    forkPolicy: repo.fork_policy as ForkPolicy | undefined,
    project:
      repo.project?.key === undefined
        ? undefined
        : { key: repo.project.key, name: repo.project.name },
    cloneUrls: { https: byName("https"), ssh: byName("ssh") },
    raw,
  };
};
