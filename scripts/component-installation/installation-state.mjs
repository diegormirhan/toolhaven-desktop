const CANCELLABLE_PHASES = new Set(["resolving", "downloading", "verifying"]);
const ACTIVE_PHASES = new Set(["resolving", "downloading", "verifying", "installing"]);

export function createInstallationState({ activeVersion = null } = {}) {
  return freezeState({
    availability: activeVersion === null ? "available" : "ready",
    phase: "idle",
    activeVersion,
    candidateVersion: null,
    progress: null,
    lastError: null
  });
}

export function transitionInstallation(state, event) {
  assertState(state);
  assertEvent(event);

  switch (event.type) {
    case "install.requested":
      return requestInstallation(state, event);
    case "dependencies.resolved":
      return enterDownloading(state, event.type);
    case "download.progressed":
      return recordDownloadProgress(state, event);
    case "download.completed":
      return enterVerifying(state, event.type);
    case "verification.succeeded":
      return enterInstalling(state, event.type);
    case "installation.succeeded":
      return completeInstallation(state, event.type);
    case "operation.cancelled":
      return cancelInstallation(state, event.type);
    case "operation.failed":
      return failInstallation(state, event);
    default:
      throw new Error(`unknown installation event "${event.type}"`);
  }
}

function requestInstallation(state, event) {
  requirePhase(state, "idle", event.type);
  requireNonEmptyString(event.version, "install version");

  if (event.version === state.activeVersion) {
    throw new Error(`version "${event.version}" is already active`);
  }

  return freezeState({
    ...state,
    phase: "resolving",
    candidateVersion: event.version,
    progress: null,
    lastError: null
  });
}

function enterDownloading(state, eventType) {
  requirePhase(state, "resolving", eventType);
  return freezeState({ ...state, phase: "downloading", progress: 0 });
}

function recordDownloadProgress(state, event) {
  requirePhase(state, "downloading", event.type);

  if (typeof event.progress !== "number" || event.progress < 0 || event.progress > 1) {
    throw new RangeError("download progress must be between 0 and 1");
  }

  return freezeState({ ...state, progress: event.progress });
}

function enterVerifying(state, eventType) {
  requirePhase(state, "downloading", eventType);
  return freezeState({ ...state, phase: "verifying", progress: null });
}

function enterInstalling(state, eventType) {
  requirePhase(state, "verifying", eventType);
  return freezeState({ ...state, phase: "installing" });
}

function completeInstallation(state, eventType) {
  requirePhase(state, "installing", eventType);

  return freezeState({
    availability: "ready",
    phase: "idle",
    activeVersion: state.candidateVersion,
    candidateVersion: null,
    progress: null,
    lastError: null
  });
}

function cancelInstallation(state, eventType) {
  if (!CANCELLABLE_PHASES.has(state.phase)) {
    throw invalidTransition(eventType, state.phase);
  }

  return restoreStableState(state, null);
}

function failInstallation(state, event) {
  if (!ACTIVE_PHASES.has(state.phase)) {
    throw invalidTransition(event.type, state.phase);
  }

  requireNonEmptyString(event.message, "failure message");
  return restoreStableState(state, event.message);
}

function restoreStableState(state, lastError) {
  return freezeState({
    availability: state.activeVersion === null ? "available" : "ready",
    phase: "idle",
    activeVersion: state.activeVersion,
    candidateVersion: null,
    progress: null,
    lastError
  });
}

function requirePhase(state, expectedPhase, eventType) {
  if (state.phase !== expectedPhase) {
    throw invalidTransition(eventType, state.phase);
  }
}

function invalidTransition(eventType, phase) {
  return new Error(`cannot apply "${eventType}" while phase is "${phase}"`);
}

function requireNonEmptyString(candidate, label) {
  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
}

function assertState(state) {
  if (typeof state !== "object" || state === null || Array.isArray(state)) {
    throw new TypeError("installation state must be an object");
  }
}

function assertEvent(event) {
  if (typeof event !== "object" || event === null || typeof event.type !== "string") {
    throw new TypeError("installation event must have a type");
  }
}

function freezeState(state) {
  return Object.freeze(state);
}
