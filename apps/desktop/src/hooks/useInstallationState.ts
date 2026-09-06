import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import toolManifest from "../../../../tooling/tools.json";
import { createInstallationState, type InstallationState } from "../../../../scripts/component-installation/installation-state.mjs";
import { resolveInstallationPlan, type InstallationPlanStep } from "../../../../scripts/component-installation/resolve-installation-plan.mjs";

type InstallationStates = Record<string, InstallationState>;

/** Mirrors the host's actual tool availability; it never fakes a completed install. */
export function useInstallationState() {
  const [states, setStates] = useState<InstallationStates>(() =>
    Object.fromEntries(
      toolManifest.tools.map((tool) => [
        tool.id,
        createInstallationState({ activeVersion: tool.status === "bundled" ? "bundled" : null }),
      ]),
    ),
  );

  useEffect(() => {
    if (!isNativeHost()) return;

    let cancelled = false;
    void invoke<string[]>("detect_available_tools")
      .then((toolIds) => {
        if (cancelled) return;
        const available = new Set(toolIds);
        setStates((current) => {
          const next = { ...current };
          for (const tool of toolManifest.tools) {
            if (available.has(tool.id)) next[tool.id] = createInstallationState({ activeVersion: "system" });
          }
          return next;
        });
      })
      .catch(() => {
        // Browser preview has no native command bridge; manifest defaults remain honest.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const installedToolIds = useMemo(
    () => Object.entries(states).filter(([, state]) => state.availability === "ready").map(([id]) => id),
    [states],
  );

  function planInstallation(toolId: string): InstallationPlanStep[] {
    return resolveInstallationPlan(toolManifest, { requestedToolIds: [toolId], installedToolIds });
  }

  return { states, planInstallation };
}

function isNativeHost(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
