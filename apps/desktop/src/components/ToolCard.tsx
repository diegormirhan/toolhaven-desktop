import { ArrowUpRight, Check, Download } from "lucide-react";
import type { InstallationState } from "../../../../scripts/component-installation/installation-state.mjs";
import type { CatalogTool } from "../catalog/catalog";
import { ToolArtwork } from "./ToolArtwork";

type ToolCardProps = {
  tool: CatalogTool;
  installation: InstallationState;
  onOpen: (tool: CatalogTool, trigger: HTMLButtonElement) => void;
  onInstall: (tool: CatalogTool) => void;
};

const phaseLabels: Record<InstallationState["phase"], string> = {
  idle: "",
  resolving: "Preparing",
  downloading: "Downloading",
  verifying: "Verifying",
  installing: "Installing",
};

export function ToolCard({ tool, installation, onOpen, onInstall }: ToolCardProps) {
  const isBusy = installation.phase !== "idle";
  const isReady = installation.availability === "ready";
  const progress = Math.round((installation.progress ?? 0) * 100);
  const readyLabel =
    installation.activeVersion === "bundled" ? "Included" : "Ready";

  return (
    <article className={`tool-card tool-card--${tool.size} tool-card--${tool.accent}`}>
      <ToolArtwork toolId={tool.id} label={tool.integrationName} />
      <span className={`availability availability--${isReady ? "ready" : "available"}`}>
        {isReady ? <Check size={12} aria-hidden="true" /> : <Download size={12} aria-hidden="true" />}
        {isReady ? readyLabel : (tool.downloadLabel ?? "Not installed")}
      </span>

      <div className="tool-card__content">
        <div className="tool-card__copy">
          <h3>{tool.title}</h3>
          <p>{tool.description}</p>
        </div>

        {installation.lastError ? (
          <div className="install-error" role="alert">
            <span>{installation.lastError}</span>
            <button className="button button--light button--small" type="button" onClick={() => onInstall(tool)}>
              Try again
            </button>
          </div>
        ) : isBusy ? (
          <div className="install-progress" aria-live="polite">
            <div className="install-progress__line">
              <span>{phaseLabels[installation.phase]}</span>
              {installation.phase === "downloading" && <span>{progress}%</span>}
            </div>
            <div
              className={`progress-track ${installation.progress === null ? "progress-track--indeterminate" : ""}`}
              role="progressbar"
              aria-label={`Progress of ${tool.integrationName}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={installation.progress === null ? undefined : progress}
            >
              <span style={{ inlineSize: installation.progress === null ? undefined : `${progress}%` }} />
            </div>
            {installation.phase !== "installing" && (
              <span className="install-progress__note">Waiting for the host to finish.</span>
            )}
          </div>
        ) : (
          <button
            className={`button ${isReady ? "button--light" : "button--primary"}`}
            type="button"
            onClick={(event) => (isReady ? onOpen(tool, event.currentTarget) : onInstall(tool))}
            aria-label={`${isReady ? "Open" : "Get"} ${tool.integrationName}`}
          >
            {isReady ? "Open" : "Get it"}
            <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}
