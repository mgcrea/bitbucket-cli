import type { PipelineStatus, PipelineStep, PipelineSummary } from "../../flavor/domain.js";

type RawError = { message?: string; key?: string };

type RawState = {
  name?: string;
  type?: string;
  result?: { name?: string; type?: string; error?: RawError };
  stage?: { name?: string };
};

type RawPipeline = {
  uuid?: string;
  build_number?: number;
  state?: RawState;
  created_on?: string;
  completed_on?: string;
  duration_in_seconds?: number;
  creator?: { display_name?: string };
  trigger?: { name?: string };
  target?: {
    ref_type?: string;
    ref_name?: string;
    selector?: { type?: string; pattern?: string };
    commit?: { hash?: string };
  };
};

/**
 * Flattens the nested state union into one status.
 *
 * A finished run reports `COMPLETED` at the top level and the outcome underneath, so
 * reading `state.name` alone cannot distinguish success from failure.
 */
export const normalizeStatus = (state: RawState | undefined): PipelineStatus => {
  const name = (state?.name ?? "").toUpperCase();
  if (name === "PENDING") return "pending";
  if (name === "IN_PROGRESS") return "in-progress";
  if (name === "COMPLETED") {
    switch ((state?.result?.name ?? "").toUpperCase()) {
      case "SUCCESSFUL":
        return "successful";
      case "FAILED":
        return "failed";
      case "ERROR":
        return "error";
      case "STOPPED":
        return "stopped";
      default:
        return "unknown";
    }
  }
  return name === "" ? "unknown" : "unknown";
};

export const normalizePipeline = (raw: unknown, repoUrl: string): PipelineSummary => {
  const pipeline = (raw ?? {}) as RawPipeline;
  const state = pipeline.state;
  const buildNumber = pipeline.build_number ?? 0;

  return {
    uuid: pipeline.uuid ?? "",
    buildNumber,
    status: normalizeStatus(state),
    stateName: state?.name ?? "UNKNOWN",
    stage: state?.stage?.name,
    refType: pipeline.target?.ref_type,
    refName: pipeline.target?.ref_name,
    selector:
      pipeline.target?.selector?.type === "custom"
        ? pipeline.target.selector.pattern
        : pipeline.target?.selector?.type,
    commit: pipeline.target?.commit?.hash,
    trigger: pipeline.trigger?.name,
    creator: pipeline.creator?.display_name,
    createdAt: pipeline.created_on ?? "",
    completedAt: pipeline.completed_on,
    durationSeconds: pipeline.duration_in_seconds,
    errorMessage: state?.result?.error?.message,
    url: `${repoUrl}/pipelines/results/${buildNumber}`,
  };
};

type RawStep = {
  uuid?: string;
  name?: string;
  state?: RawState;
  duration_in_seconds?: number;
};

export const normalizePipelineStep = (raw: unknown): PipelineStep => {
  const step = (raw ?? {}) as RawStep;
  return {
    uuid: step.uuid ?? "",
    // Bitbucket omits the name for a single unnamed step.
    name: step.name ?? "(unnamed step)",
    status: normalizeStatus(step.state),
    durationSeconds: step.duration_in_seconds,
    errorMessage: step.state?.result?.error?.message,
  };
};
