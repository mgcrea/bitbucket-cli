import { REPOSITORY_FIELDS } from "../fields/presets.js";
import { buildFields, type FieldProjection, forCollection } from "../fields/projection.js";
import type { RepoRef, Repository, RepositorySummary } from "../flavor/domain.js";
import type {
  CreateRepositoryInput,
  FieldsOption,
  ListRepositoriesOptions,
  RepositoriesResource,
} from "../flavor/types.js";
import type { HttpClient } from "../http/http-client.js";
import { paginate } from "../pagination/paginate.js";
import { normalizeRepository, normalizeRepositorySummary } from "./normalize/repository.js";
import * as paths from "./paths.js";

const resolveFields = (
  option: FieldsOption | undefined,
  fallback: FieldProjection,
): FieldProjection => {
  if (option === undefined) {
    return fallback;
  }
  return typeof option === "string" ? REPOSITORY_FIELDS[option] : option;
};

export const createRepositoriesResource = (http: HttpClient): RepositoriesResource => {
  const get = async (
    ref: RepoRef,
    options?: { fields?: FieldsOption | undefined },
  ): Promise<Repository> => {
    const raw = await http.request<unknown>({
      path: paths.REPOSITORY(ref.workspace, ref.repository),
      query: { fields: buildFields(resolveFields(options?.fields, REPOSITORY_FIELDS.wide)) },
    });
    return normalizeRepository(raw);
  };

  return {
    list(options: ListRepositoriesOptions): AsyncIterable<RepositorySummary> {
      const source = paginate<unknown>(
        http,
        {
          // `workspace` is required by the type: the cross-workspace listing endpoint
          // was removed and now returns 410.
          path: paths.REPOSITORIES(options.workspace),
          query: {
            q: options.query,
            sort: options.sort,
            role: options.role,
            fields: buildFields(
              forCollection(resolveFields(options.fields, REPOSITORY_FIELDS.list)),
            ),
          },
        },
        options,
      );

      return (async function* map(): AsyncGenerator<RepositorySummary> {
        for await (const raw of source) {
          yield normalizeRepositorySummary(raw);
        }
      })();
    },

    get,

    async create(input: CreateRepositoryInput): Promise<Repository> {
      const raw = await http.request<unknown>({
        method: "POST",
        // The slug goes in the PATH, not the body — unlike almost every other create.
        path: paths.REPOSITORY(input.workspace, input.repository),
        body: {
          scm: "git",
          ...(input.isPrivate === undefined ? {} : { is_private: input.isPrivate }),
          ...(input.description === undefined ? {} : { description: input.description }),
          ...(input.language === undefined ? {} : { language: input.language }),
          ...(input.forkPolicy === undefined ? {} : { fork_policy: input.forkPolicy }),
          ...(input.project === undefined ? {} : { project: { key: input.project } }),
        },
      });
      return normalizeRepository(raw);
    },

    async delete(ref: RepoRef): Promise<void> {
      await http.request({
        method: "DELETE",
        path: paths.REPOSITORY(ref.workspace, ref.repository),
      });
    },

    async defaultBranch(ref: RepoRef): Promise<string> {
      const raw = await http.request<{ mainbranch?: { name?: string } }>({
        path: paths.REPOSITORY(ref.workspace, ref.repository),
        query: { fields: "mainbranch.name" },
      });
      return raw.mainbranch?.name ?? "main";
    },
  };
};
