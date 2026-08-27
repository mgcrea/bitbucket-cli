import { PULL_REQUEST_FIELDS } from "../fields/presets.js";
import { buildFields, type FieldProjection, forCollection } from "../fields/projection.js";
import type {
  CommitStatus,
  CommitSummary,
  MergeOutcome,
  MergeStrategy,
  PollOptions,
  PullRequest,
  PullRequestRef,
  PullRequestSummary,
  RepoRef,
  ReviewDecision,
} from "../flavor/domain.js";
import type {
  CreatePullRequestInput,
  FieldsOption,
  ListPullRequestsOptions,
  MergePullRequestInput,
  PullRequestsResource,
  UpdatePullRequestInput,
} from "../flavor/types.js";
import { NotFoundError, ResponseParseError } from "../http/errors.js";
import type { HttpClient } from "../http/http-client.js";
import { paginate } from "../pagination/paginate.js";
import { and, contains, eq, inList } from "../query/bbql.js";
import { normalizeCommit, normalizeCommitStatus } from "./normalize/commit.js";
import {
  normalizePullRequest,
  normalizePullRequestSummary,
  toWireState,
} from "./normalize/pull-request.js";
import * as paths from "./paths.js";

const WIRE_STRATEGY: Record<MergeStrategy, string> = {
  "merge-commit": "merge_commit",
  squash: "squash",
  "fast-forward": "fast_forward",
  "squash-fast-forward": "squash_fast_forward",
  "rebase-fast-forward": "rebase_fast_forward",
  "rebase-merge": "rebase_merge",
};

const resolveFields = (
  option: FieldsOption | undefined,
  fallback: FieldProjection,
): FieldProjection => {
  if (option === undefined) {
    return fallback;
  }
  if (typeof option === "string") {
    return PULL_REQUEST_FIELDS[option];
  }
  return option;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Withdrawing a review state that was never set answers 404, which is the desired
 * outcome here rather than a failure.
 */
const ignoreMissing = async (promise: Promise<unknown>): Promise<void> => {
  try {
    await promise;
  } catch (error) {
    if (!(error instanceof NotFoundError)) {
      throw error;
    }
  }
};

export const createPullRequestsResource = (http: HttpClient): PullRequestsResource => {
  const get = async (
    ref: PullRequestRef,
    options?: { fields?: FieldsOption | undefined },
  ): Promise<PullRequest> => {
    const raw = await http.request<unknown>({
      path: paths.PULL_REQUEST(ref.workspace, ref.repository, ref.id),
      query: { fields: buildFields(resolveFields(options?.fields, PULL_REQUEST_FIELDS.wide)) },
    });
    return normalizePullRequest(raw);
  };

  return {
    list(options: ListPullRequestsOptions): AsyncIterable<PullRequestSummary> {
      // Every user-supplied value goes through the BBQL quoter; `--search "a\" OR x"`
      // must not be able to close the string and append clauses.
      const query =
        options.query ??
        and(
          options.state === undefined || options.state.length === 0
            ? undefined
            : inList("state", options.state.map(toWireState)),
          options.author === undefined ? undefined : eq("author.uuid", options.author),
          options.reviewer === undefined ? undefined : eq("reviewers.uuid", options.reviewer),
          options.sourceBranch === undefined
            ? undefined
            : eq("source.branch.name", options.sourceBranch),
          options.destinationBranch === undefined
            ? undefined
            : eq("destination.branch.name", options.destinationBranch),
          options.search === undefined ? undefined : contains("title", options.search),
        );

      const source = paginate<unknown>(
        http,
        {
          path: paths.PULL_REQUESTS(options.workspace, options.repository),
          query: {
            q: query,
            sort: options.sort,
            fields: buildFields(
              forCollection(resolveFields(options.fields, PULL_REQUEST_FIELDS.list)),
            ),
          },
        },
        options,
      );

      return (async function* map(): AsyncGenerator<PullRequestSummary> {
        for await (const raw of source) {
          yield normalizePullRequestSummary(raw);
        }
      })();
    },

    get,

    async create(target: RepoRef, input: CreatePullRequestInput): Promise<PullRequest> {
      const raw = await http.request<unknown>({
        method: "POST",
        path: paths.PULL_REQUESTS(target.workspace, target.repository),
        body: {
          title: input.title,
          ...(input.description === undefined ? {} : { description: input.description }),
          source: {
            branch: { name: input.sourceBranch },
            // Omitted for a same-repo pull request; required for a fork.
            ...(input.sourceRepository === undefined
              ? {}
              : { repository: { full_name: input.sourceRepository } }),
          },
          ...(input.destinationBranch === undefined
            ? {}
            : { destination: { branch: { name: input.destinationBranch } } }),
          ...(input.reviewers === undefined
            ? {}
            : { reviewers: input.reviewers.map((uuid) => ({ uuid })) }),
          ...(input.closeSourceBranch === undefined
            ? {}
            : { close_source_branch: input.closeSourceBranch }),
          ...(input.draft === undefined ? {} : { draft: input.draft }),
        },
      });
      return normalizePullRequest(raw);
    },

    async update(ref: PullRequestRef, input: UpdatePullRequestInput): Promise<PullRequest> {
      const raw = await http.request<unknown>({
        method: "PUT",
        path: paths.PULL_REQUEST(ref.workspace, ref.repository, ref.id),
        body: {
          ...(input.title === undefined ? {} : { title: input.title }),
          ...(input.description === undefined ? {} : { description: input.description }),
          ...(input.destinationBranch === undefined
            ? {}
            : { destination: { branch: { name: input.destinationBranch } } }),
          ...(input.reviewers === undefined
            ? {}
            : { reviewers: input.reviewers.map((uuid) => ({ uuid })) }),
          ...(input.draft === undefined ? {} : { draft: input.draft }),
        },
      });
      return normalizePullRequest(raw);
    },

    /**
     * Bitbucket answers a merge with 200 and the merged pull request, or 202 and a
     * `Location` pointing at a task to poll. Both are surfaced so a caller can show
     * progress rather than blocking silently.
     */
    async merge(ref: PullRequestRef, input: MergePullRequestInput = {}): Promise<MergeOutcome> {
      const { data, response } = await http.requestWithResponse<unknown>({
        method: "POST",
        path: paths.PULL_REQUEST_MERGE(ref.workspace, ref.repository, ref.id),
        body: {
          type: "pullrequest_merge_parameters",
          ...(input.message === undefined ? {} : { message: input.message }),
          ...(input.closeSourceBranch === undefined
            ? {}
            : { close_source_branch: input.closeSourceBranch }),
          ...(input.strategy === undefined
            ? {}
            : { merge_strategy: WIRE_STRATEGY[input.strategy] }),
        },
        ...(input.signal === undefined ? {} : { signal: input.signal }),
      });

      if (response.status !== 202) {
        return { status: "merged", pullRequest: normalizePullRequest(data) };
      }

      const taskUrl = response.headers.get("location");
      if (taskUrl === null) {
        throw new ResponseParseError("Merge returned 202 without a Location header to poll");
      }

      const poll = async (options: PollOptions = {}): Promise<PullRequest> => {
        const timeoutMs = options.timeoutMs ?? 300_000;
        const deadline = Date.now() + timeoutMs;
        let interval = options.intervalMs ?? 1000;

        for (let attempt = 1; Date.now() < deadline; attempt += 1) {
          options.onPoll?.(attempt);
          const task = await http.request<{ task_status?: string; merge_result?: unknown }>({
            path: taskUrl,
            ...(options.signal === undefined ? {} : { signal: options.signal }),
          });
          if (task.task_status === "COMPLETED") {
            return normalizePullRequest(task.merge_result);
          }
          await sleep(interval);
          interval = Math.min(interval * 2, 5000);
        }
        throw new ResponseParseError(`Merge task did not complete within ${timeoutMs}ms`);
      };

      if (input.wait === true) {
        const pullRequest = await poll(input.signal === undefined ? {} : { signal: input.signal });
        return { status: "merged", pullRequest };
      }
      return { status: "pending", taskUrl, poll };
    },

    async decline(ref: PullRequestRef): Promise<PullRequest> {
      const raw = await http.request<unknown>({
        method: "POST",
        path: paths.PULL_REQUEST_DECLINE(ref.workspace, ref.repository, ref.id),
      });
      return normalizePullRequest(raw);
    },

    /**
     * Cloud spreads review state across four endpoints. Clearing a decision means
     * withdrawing both an approval and a change request, and whichever was not set
     * answers 404 — which is success here, not a failure.
     */
    async setReview(ref: PullRequestRef, decision: ReviewDecision): Promise<void> {
      const approve = paths.PULL_REQUEST_APPROVE(ref.workspace, ref.repository, ref.id);
      const requestChanges = paths.PULL_REQUEST_REQUEST_CHANGES(
        ref.workspace,
        ref.repository,
        ref.id,
      );

      if (decision === "approved") {
        await http.request({ method: "POST", path: approve });
        return;
      }
      if (decision === "changes-requested") {
        await http.request({ method: "POST", path: requestChanges });
        return;
      }
      await ignoreMissing(http.request({ method: "DELETE", path: approve }));
      await ignoreMissing(http.request({ method: "DELETE", path: requestChanges }));
    },

    commits(ref, options) {
      const source = paginate<unknown>(
        http,
        { path: paths.PULL_REQUEST_COMMITS(ref.workspace, ref.repository, ref.id) },
        options ?? {},
      );
      return (async function* map(): AsyncGenerator<CommitSummary> {
        for await (const raw of source) {
          yield normalizeCommit(raw);
        }
      })();
    },

    statuses(ref, options) {
      const source = paginate<unknown>(
        http,
        { path: paths.PULL_REQUEST_STATUSES(ref.workspace, ref.repository, ref.id) },
        options ?? {},
      );
      return (async function* map(): AsyncGenerator<CommitStatus> {
        for await (const raw of source) {
          yield normalizeCommitStatus(raw);
        }
      })();
    },

    // Text endpoints, not JSON.
    diff: (ref) =>
      http.requestText({ path: paths.PULL_REQUEST_DIFF(ref.workspace, ref.repository, ref.id) }),
    patch: (ref) =>
      http.requestText({ path: paths.PULL_REQUEST_PATCH(ref.workspace, ref.repository, ref.id) }),
  };
};
