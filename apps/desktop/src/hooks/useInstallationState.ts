import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import toolManifest from "../../../../tooling/tools.json";
import {
  createInstallationState,
  transitionInstallation,
  type InstallationEvent,
  type InstallationState,
} from "../../../../scripts/component-installation/installation-state.mjs";
import { resolveInstallationPlan, type InstallationPlanStep } from "../../../../scripts/component-installation/resolve-installation-plan.mjs";
import { isNativeHost } from "./useOperationRunner";

type InstallationStates = Record<string, InstallationState>;

type ComponentProgressEvent = {
  toolId: string;
  phase: "downloading" | "verifying" | "installing" | "ready";
  progress: number | null;
  message: string;
};

const manifestVersions = Object.fromEntries(
  toolManifest.tools.map((tool) => [tool.id, "version" in tool ? String(tool.version) : "pinned"]),
);

/**
 * Mirrors the host's real tool availability and drives the in-app installation of the
 * components that do not ship inside the installer. It never fakes a completed install:
 * a card only turns ready after the host reports the binary is there.
 */
export function useInstallationState() {
  const [states, setStates] = useState<InstallationStates>(() =>
    Object.fromEntries(
      toolManifest.tools.map((tool) => [
        tool.id,
        createInstallationState({ activeVersion: tool.status === "bundled" ? "bundled" : null }),
      ]),
    ),
  );
  const installing = useRef(new Set<string>());

  const apply = useCallback((toolId: string, event: InstallationEvent) => {
    setStates((current) => {
      const state = current[toolId];
      if (!state) return current;
      try {
        return { ...current, [toolId]: transitionInstallation(state, event) };
      } catch {
        // An out-of-order event must never crash the catalog.
        return current;
      }
    });
  }, []);

  const refreshDetection = useCallback(() => {
    if (!isNativeHost()) return;
    void invoke<string[]>("detect_available_tools")
      .then((toolIds) => {
        const available = new Set(toolIds);
        setStates((current) => {
          const next = { ...current };
          for (const tool of toolManifest.tools) {
            if (!available.has(tool.id)) continue;
            // A tool the installer ships stays labelled as bundled even though the host
            // just resolved it: the manifest, not the probe, says what we distribute.
            next[tool.id] = createInstallationState({
              activeVersion: tool.status === "bundled" ? "bundled" : "installed",
            });
          }
          return next;
        });
      })
      .catch(() => {
        // Browser preview has no native command bridge; manifest defaults remain honest.
      });
  }, []);

  useEffect(refreshDetection, [refreshDetection]);

  useEffect(() => {
    if (!isNativeHost()) return;
    let active = true;
    let unlisten: (() => void) | undefined;

    void listen<ComponentProgressEvent>("component-progress", (event) => {
      if (!active) return;
      const { toolId, phase, progress } = event.payload;
      if (phase === "downloading") {
        apply(toolId, { type: "download.progressed", progress: progress ?? 0 });
        return;
      }
      if (phase === "verifying") {
        apply(toolId, { type: "download.completed" });
        return;
      }
      if (phase === "installing") apply(toolId, { type: "verification.succeeded" });
    })
      .then((cleanup) => {
        if (active) unlisten = cleanup;
        else cleanup();
      })
      .catch(() => {
        // No native bridge in the browser preview.
      });

    return () => {
      active = false;
      unlisten?.();
    };
  }, [apply]);

  const installedToolIds = Object.entries(states)
    .filter(([, state]) => state.availability === "ready")
    .map(([id]) => id);

  function planInstallation(toolId: string): InstallationPlanStep[] {
    return resolveInstallationPlan(toolManifest, { requestedToolIds: [toolId], installedToolIds });
  }

  /** Every tool the plan touches shows its own progress, so nothing looks stuck. */
  async function installTool(toolId: string) {
    if (!isNativeHost() || installing.current.has(toolId)) return;
    installing.current.add(toolId);

    const plan = planInstallation(toolId);
    const pending = plan.length > 0 ? plan.map((step) => step.toolId) : [toolId];
    for (const id of pending) {
      apply(id, { type: "install.requested", version: manifestVersions[id] ?? "pinned" });
      apply(id, { type: "dependencies.resolved" });
    }

    try {
      await invoke<string[]>("install_component", { toolId });
      for (const id of pending) apply(id, { type: "installation.succeeded" });
      refreshDetection();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : typeof error === "string" ? error : "A instalação falhou.";
      for (const id of pending) apply(id, { type: "operation.failed", message });
    } finally {
      installing.current.delete(toolId);
    }
  }

  return { states, planInstallation, installTool };
}
