import { validateToolManifest } from "../tool-manifest/validate-tool-manifest.mjs";

export function resolveInstallationPlan(manifest, request) {
  assertValidManifest(manifest);
  const normalizedRequest = normalizeRequest(request);
  const toolsById = new Map(manifest.tools.map((tool) => [tool.id, tool]));
  assertRegisteredIds(normalizedRequest.requestedToolIds, toolsById, "requested tool");
  assertRegisteredIds(normalizedRequest.installedToolIds, toolsById, "installed tool");

  const installedToolIds = new Set(normalizedRequest.installedToolIds);
  const requestedToolIds = new Set(normalizedRequest.requestedToolIds);
  const resolvedToolIds = new Set();
  const activePath = [];
  const plan = [];

  function visit(toolId) {
    if (resolvedToolIds.has(toolId)) {
      return;
    }

    const cycleStart = activePath.indexOf(toolId);
    if (cycleStart !== -1) {
      const cycle = [...activePath.slice(cycleStart), toolId];
      throw new Error(`circular dependency: ${cycle.join(" -> ")}`);
    }

    const tool = toolsById.get(toolId);

    if (tool.delivery === "embedded" || installedToolIds.has(toolId)) {
      resolvedToolIds.add(toolId);
      return;
    }

    activePath.push(toolId);
    for (const dependencyId of tool.dependencies ?? []) {
      visit(dependencyId);
    }
    activePath.pop();

    resolvedToolIds.add(toolId);
    plan.push({
      toolId,
      reason: requestedToolIds.has(toolId) ? "requested" : "dependency"
    });
  }

  for (const requestedToolId of requestedToolIds) {
    visit(requestedToolId);
  }

  return plan;
}

function assertValidManifest(manifest) {
  const issues = validateToolManifest(manifest);
  if (issues.length === 0) {
    return;
  }

  const issueSummary = issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
  throw new Error(`cannot resolve an invalid tool manifest: ${issueSummary}`);
}

function normalizeRequest(request) {
  if (typeof request !== "object" || request === null || Array.isArray(request)) {
    throw new TypeError("installation request must be an object");
  }

  const requestedToolIds = normalizeIdList(request.requestedToolIds, "requestedToolIds");
  const installedToolIds = normalizeIdList(request.installedToolIds ?? [], "installedToolIds");

  if (requestedToolIds.length === 0) {
    throw new Error("requestedToolIds must contain at least one tool id");
  }

  return { requestedToolIds, installedToolIds };
}

function normalizeIdList(candidate, fieldName) {
  if (!Array.isArray(candidate) || candidate.some((toolId) => typeof toolId !== "string")) {
    throw new TypeError(`${fieldName} must be an array of tool ids`);
  }

  return [...new Set(candidate)];
}

function assertRegisteredIds(toolIds, toolsById, label) {
  for (const toolId of toolIds) {
    if (!toolsById.has(toolId)) {
      throw new Error(`${label} "${toolId}" is not registered`);
    }
  }
}
