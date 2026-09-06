import { useMemo, useState } from "react";

export type JobStatus = "queued" | "running" | "succeeded";

export type ToolJob = {
  id: string;
  toolId: string;
  toolName: string;
  operationLabel: string;
  sourceLabel: string;
  status: JobStatus;
  progress: number;
  options: Record<string, string>;
};

export type EnqueueJobInput = Omit<ToolJob, "id" | "status" | "progress">;

export function useJobQueue() {
  const [jobs, setJobs] = useState<ToolJob[]>([]);

  function enqueueJob(input: EnqueueJobInput, status: JobStatus = "queued") {
    setJobs((currentJobs) => [
      {
        ...input,
        id: `${input.toolId}-${Date.now()}`,
        status,
        progress: status === "succeeded" ? 1 : 0,
      },
      ...currentJobs,
    ]);
  }

  const activeJobs = useMemo(() => jobs.filter((job) => job.status !== "succeeded"), [jobs]);
  const completedJobs = useMemo(() => jobs.filter((job) => job.status === "succeeded"), [jobs]);

  return { jobs, activeJobs, completedJobs, enqueueJob };
}
