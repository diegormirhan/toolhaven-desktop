export type InstallationPlanStep = {
  toolId: string;
  reason: "dependency" | "requested";
};

export function resolveInstallationPlan(
  manifest: unknown,
  request: { requestedToolIds: string[]; installedToolIds?: string[] },
): InstallationPlanStep[];
