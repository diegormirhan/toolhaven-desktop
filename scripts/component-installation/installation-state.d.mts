export type InstallationState = {
  availability: "available" | "ready";
  phase: "idle" | "resolving" | "downloading" | "verifying" | "installing";
  activeVersion: string | null;
  candidateVersion: string | null;
  progress: number | null;
  lastError: string | null;
};

export type InstallationEvent =
  | { type: "install.requested"; version: string }
  | { type: "dependencies.resolved" }
  | { type: "download.progressed"; progress: number }
  | { type: "download.completed" }
  | { type: "verification.succeeded" }
  | { type: "installation.succeeded" }
  | { type: "operation.cancelled" }
  | { type: "operation.failed"; message: string };

export function createInstallationState(options?: {
  activeVersion?: string | null;
}): InstallationState;

export function transitionInstallation(
  state: InstallationState,
  event: InstallationEvent,
): InstallationState;
