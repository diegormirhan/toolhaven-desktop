import { useCallback, useMemo, useState } from "react";

export type JobStatus = "running" | "succeeded" | "failed";

export type ToolJob = {
  id: string;
  toolId: string;
  toolName: string;
  operationId: string;
  operationLabel: string;
  sourceLabel: string;
  status: JobStatus;
  /** `null` means the tool reports no measurable percentage; the UI must not invent one. */
  progress: number | null;
  message: string;
  outputPath: string | null;
  options: Record<string, string>;
  startedAt: number;
};

export type StartJobInput = Pick<
  ToolJob,
  "toolId" | "toolName" | "operationId" | "operationLabel" | "sourceLabel" | "options"
>;

export type JobProgressUpdate = { progress: number | null; message: string };

export type JobOutcome = { status: Exclude<JobStatus, "running">; message: string; outputPath?: string | null };

let jobSequence = 0;

/**
 * Owns every operation the session started, independent of which panel is open.
 * Closing a tool panel must never lose a job that the host is still running.
 */
export function useJobQueue() {
  const [jobs, setJobs] = useState<ToolJob[]>([]);

  const startJob = useCallback((input: StartJobInput): string => {
    jobSequence += 1;
    const id = `${input.toolId}-${input.operationId}-${jobSequence}`;
    setJobs((current) => [
      {
        ...input,
        id,
        status: "running",
        // Null, not zero: until the tool reports a percentage there is none to show.
        progress: null,
        message: "Preparando operação…",
        outputPath: null,
        startedAt: Date.now(),
      },
      ...current,
    ]);
    return id;
  }, []);

  const reportProgress = useCallback((jobId: string, update: JobProgressUpdate) => {
    setJobs((current) =>
      current.map((job) =>
        job.id === jobId && job.status === "running"
          ? { ...job, progress: update.progress, message: update.message || job.message }
          : job,
      ),
    );
  }, []);

  const settleJob = useCallback((jobId: string, outcome: JobOutcome) => {
    setJobs((current) =>
      current.map((job) =>
        job.id === jobId
          ? {
              ...job,
              status: outcome.status,
              progress: outcome.status === "succeeded" ? 1 : job.progress,
              message: outcome.message,
              outputPath: outcome.outputPath ?? job.outputPath,
            }
          : job,
      ),
    );
  }, []);

  const clearFinishedJobs = useCallback(() => {
    setJobs((current) => current.filter((job) => job.status === "running"));
  }, []);

  const runningJobs = useMemo(() => jobs.filter((job) => job.status === "running"), [jobs]);
  const finishedJobs = useMemo(() => jobs.filter((job) => job.status !== "running"), [jobs]);

  return { jobs, runningJobs, finishedJobs, startJob, reportProgress, settleJob, clearFinishedJobs };
}

export function findJob(jobs: ToolJob[], jobId: string | null): ToolJob | undefined {
  return jobId ? jobs.find((job) => job.id === jobId) : undefined;
}
