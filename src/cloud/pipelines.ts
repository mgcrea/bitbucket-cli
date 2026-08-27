import type { PipelineStatus, PipelineStep, PipelineSummary, RepoRef } from "../flavor/domain.js";
import type { ListPipelinesOptions, PipelinesResource } from "../flavor/types.js";
import type { HttpClient } from "../http/http-client.js";
import { type PaginateOptions, paginate } from "../pagination/paginate.js";
import { and, eq } from "../query/bbql.js";
import { normalizePipeline, normalizePipelineStep } from "./normalize/pipeline.js";
import * as paths from "./paths.js";

const repoUrl = (ref: RepoRef): string =>
  `https://bitbucket.org/${ref.workspace}/${ref.repository}`;

/** A build number addresses a pipeline directly; a UUID needs its braces preserved. */
const selectorFor = (selector: number | string): string => String(selector);

export const createPipelinesResource = (http: HttpClient): PipelinesResource => ({
  list(options: ListPipelinesOptions): AsyncIterable<PipelineSummary> {
    const query = and(options.ref === undefined ? undefined : eq("target.ref_name", options.ref));

    const source = paginate<unknown>(
      http,
      {
        path: paths.PIPELINES(options.workspace, options.repository),
        query: {
          q: query,
          // Newest first is what anyone checking a pipeline wants; Bitbucket's default
          // is oldest first, which puts a years-old run at the top.
          sort: options.sort ?? "-created_on",
        },
      },
      options,
    );

    const wanted: ReadonlySet<PipelineStatus> | undefined =
      options.status === undefined || options.status.length === 0
        ? undefined
        : new Set(options.status);

    return (async function* map(): AsyncGenerator<PipelineSummary> {
      for await (const raw of source) {
        const pipeline = normalizePipeline(raw, repoUrl(options));
        // Status lives in a nested union that BBQL cannot address, so this filter is
        // client-side. `--limit` still bounds how much gets fetched.
        if (wanted === undefined || wanted.has(pipeline.status)) {
          yield pipeline;
        }
      }
    })();
  },

  async get(ref: RepoRef, selector: number | string): Promise<PipelineSummary> {
    const raw = await http.request<unknown>({
      path: paths.PIPELINE(ref.workspace, ref.repository, selectorFor(selector)),
    });
    return normalizePipeline(raw, repoUrl(ref));
  },

  steps(ref: RepoRef, uuid: string, options: PaginateOptions = {}): AsyncIterable<PipelineStep> {
    const source = paginate<unknown>(
      http,
      { path: paths.PIPELINE_STEPS(ref.workspace, ref.repository, uuid) },
      options,
    );
    return (async function* map(): AsyncGenerator<PipelineStep> {
      for await (const raw of source) {
        yield normalizePipelineStep(raw);
      }
    })();
  },

  // Plain text rather than JSON, so this bypasses the usual parse path.
  log: (ref, uuid, stepUuid) =>
    http.requestText({
      path: paths.PIPELINE_STEP_LOG(ref.workspace, ref.repository, uuid, stepUuid),
    }),
});
