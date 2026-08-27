import type { PipelineStatus } from "../../flavor/domain.js";
import type { Style } from "../../output/color.js";

export const STATUS_STYLE: Record<PipelineStatus, Style> = {
  successful: "green",
  failed: "red",
  error: "red",
  stopped: "yellow",
  "in-progress": "cyan",
  pending: "dim",
  unknown: "dim",
};

/** Readable without colour too, since piped output has none. */
export const STATUS_MARK: Record<PipelineStatus, string> = {
  successful: "✓",
  failed: "✗",
  error: "✗",
  stopped: "■",
  "in-progress": "●",
  pending: "·",
  unknown: "?",
};

export const formatDuration = (seconds: number | undefined): string => {
  if (seconds === undefined) {
    return "";
  }
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  return minutes < 60
    ? `${minutes}m${seconds % 60}s`
    : `${Math.floor(minutes / 60)}h${minutes % 60}m`;
};

export const ALL_STATUSES: readonly PipelineStatus[] = [
  "pending",
  "in-progress",
  "successful",
  "failed",
  "error",
  "stopped",
];
