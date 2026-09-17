import { AlertTriangle, Download, RefreshCw, X } from "lucide-react";
import type { UpdateState } from "../hooks/useUpdate";

/**
 * Says what the update is doing, and nothing when it is doing nothing.
 *
 * It arrives from above and stops just under the top bar, over the catalog
 * rather than pushing it down: the news is worth noticing once, and the window
 * underneath it is not rearranged to carry it.
 */
export function UpdateCard({
  state,
  onRestart,
  onDismiss,
}: {
  state: UpdateState;
  onRestart: () => void;
  onDismiss: () => void;
}) {
  // "checking" and "current" are answers to a button in Settings, and are
  // reported there; a banner for them would be an interruption saying nothing
  // happened.
  if (state.phase === "idle" || state.phase === "checking" || state.phase === "current") {
    return null;
  }

  const percentage =
    state.phase === "downloading" && state.progress != null
      ? Math.round(state.progress * 100)
      : null;

  return (
    <aside className={`update-card update-card--${state.phase}`} role="status">
      {state.phase === "downloading" && (
        <>
          <Download size={16} aria-hidden="true" />
          <span>
            Downloading version {state.version}
            {percentage == null ? "…" : ` — ${percentage}%`}
          </span>
        </>
      )}
      {state.phase === "ready" && (
        <>
          <RefreshCw size={16} aria-hidden="true" />
          <span>
            Version {state.version} is installed. Restart to use it — anything running
            now will be lost.
          </span>
          <button className="button button--primary button--small" type="button" onClick={onRestart}>
            Restart
          </button>
        </>
      )}
      {state.phase === "failed" && (
        <>
          <AlertTriangle size={16} aria-hidden="true" />
          <span>The update could not be installed: {state.message}</span>
        </>
      )}
      {state.phase !== "downloading" && (
        <button className="icon-button update-card__close" type="button" onClick={onDismiss} aria-label="Dismiss">
          <X size={16} />
        </button>
      )}
    </aside>
  );
}
