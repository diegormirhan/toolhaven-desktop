import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useJobQueue, type StartJobInput } from "../domain/job-queue";

export type OperationRequest = {
  toolId: string;
  operationId: string;
  inputPaths: string[];
  outputPath: string | null;
  options: Record<string, string>;
  sourceUrl: string | null;
};

type OperationResult = { stdout: string; outputPath?: string | null; message?: string };

type OperationProgressEvent = {
  jobId: string | null;
  toolId: string;
  operationId: string;
  phase: "starting" | "downloading" | "completed" | "error";
  progress: number | null;
  message: string;
};

const browserPreviewNotice =
  "Abra o app ToolHaven para executar operações no Windows. Esta página é apenas a interface de pré-visualização.";

/**
 * Runs operations against the native host and mirrors them in the session queue.
 * The progress listener lives here, not in the panel, so a job keeps reporting
 * after the user closes the tool it was started from.
 */
export function useOperationRunner() {
  const queue = useJobQueue();
  const { reportProgress } = queue;

  useEffect(() => {
    if (!isNativeHost()) return;
    let active = true;
    let unlisten: (() => void) | undefined;

    void listen<OperationProgressEvent>("operation-progress", (event) => {
      const progress = event.payload;
      if (!active || !progress.jobId || progress.phase === "completed" || progress.phase === "error") return;
      reportProgress(progress.jobId, { progress: progress.progress, message: progress.message });
    })
      .then((cleanup) => {
        if (active) unlisten = cleanup;
        else cleanup();
      })
      .catch(() => {
        // The browser preview intentionally has no native event bridge.
      });

    return () => {
      active = false;
      unlisten?.();
    };
  }, [reportProgress]);

  function runOperation(request: OperationRequest, meta: Omit<StartJobInput, "toolId" | "operationId">): string {
    const jobId = queue.startJob({
      toolId: request.toolId,
      operationId: request.operationId,
      ...meta,
    });

    void executeOnHost(request, jobId)
      .then((result) => {
        const message = result.stdout.trim() || result.message || "Operação concluída no host Windows.";
        queue.settleJob(jobId, { status: "succeeded", message, outputPath: result.outputPath ?? null });
      })
      .catch((error: unknown) => {
        queue.settleJob(jobId, { status: "failed", message: describeError(error) });
      });

    return jobId;
  }

  return { ...queue, runOperation };
}

async function executeOnHost(request: OperationRequest, jobId: string): Promise<OperationResult> {
  if (!isNativeHost()) throw new Error(browserPreviewNotice);
  return invoke<OperationResult>("execute_operation", { request: { ...request, jobId } });
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Não foi possível executar a operação.";
}

export function isNativeHost(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
