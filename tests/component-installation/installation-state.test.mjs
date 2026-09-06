import assert from "node:assert/strict";
import test from "node:test";

import {
  createInstallationState,
  transitionInstallation
} from "../../scripts/component-installation/installation-state.mjs";

test("moves a new installation through every verified phase", () => {
  let state = createInstallationState();

  state = transitionInstallation(state, { type: "install.requested", version: "1.0.0" });
  state = transitionInstallation(state, { type: "dependencies.resolved" });
  state = transitionInstallation(state, { type: "download.progressed", progress: 0.5 });
  state = transitionInstallation(state, { type: "download.completed" });
  state = transitionInstallation(state, { type: "verification.succeeded" });
  state = transitionInstallation(state, { type: "installation.succeeded" });

  assert.deepEqual(state, {
    availability: "ready",
    phase: "idle",
    activeVersion: "1.0.0",
    candidateVersion: null,
    progress: null,
    lastError: null
  });
});

test("cancels a download without damaging the active version", () => {
  let state = createInstallationState({ activeVersion: "1.0.0" });

  state = transitionInstallation(state, { type: "install.requested", version: "1.1.0" });
  state = transitionInstallation(state, { type: "dependencies.resolved" });
  state = transitionInstallation(state, { type: "operation.cancelled" });

  assert.deepEqual(state, {
    availability: "ready",
    phase: "idle",
    activeVersion: "1.0.0",
    candidateVersion: null,
    progress: null,
    lastError: null
  });
});

test("rolls back to the active version when an update installation fails", () => {
  let state = createInstallationState({ activeVersion: "1.0.0" });

  state = transitionInstallation(state, { type: "install.requested", version: "1.1.0" });
  state = transitionInstallation(state, { type: "dependencies.resolved" });
  state = transitionInstallation(state, { type: "download.completed" });
  state = transitionInstallation(state, { type: "verification.succeeded" });
  state = transitionInstallation(state, {
    type: "operation.failed",
    message: "health check failed"
  });

  assert.deepEqual(state, {
    availability: "ready",
    phase: "idle",
    activeVersion: "1.0.0",
    candidateVersion: null,
    progress: null,
    lastError: "health check failed"
  });
});

test("returns a failed first installation to the available state", () => {
  let state = createInstallationState();

  state = transitionInstallation(state, { type: "install.requested", version: "1.0.0" });
  state = transitionInstallation(state, {
    type: "operation.failed",
    message: "hash mismatch"
  });

  assert.equal(state.availability, "available");
  assert.equal(state.activeVersion, null);
  assert.equal(state.lastError, "hash mismatch");
});

test("rejects invalid transitions and invalid progress", () => {
  const state = createInstallationState();

  assert.throws(
    () => transitionInstallation(state, { type: "download.completed" }),
    /cannot apply "download.completed" while phase is "idle"/
  );

  const downloading = transitionInstallation(
    transitionInstallation(state, { type: "install.requested", version: "1.0.0" }),
    { type: "dependencies.resolved" }
  );

  assert.throws(
    () => transitionInstallation(downloading, { type: "download.progressed", progress: 1.1 }),
    /download progress must be between 0 and 1/
  );
});
