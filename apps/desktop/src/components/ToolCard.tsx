import type { CSSProperties } from "react";
import { ArrowUpRight, Check, Download } from "lucide-react";
import type { InstallationState } from "../../../../scripts/component-installation/installation-state.mjs";
import type { CatalogTool } from "../catalog/catalog";
import { ToolArtwork } from "./ToolArtwork";
import { useT } from "../i18n/language";

type ToolCardProps = {
  tool: CatalogTool;
  installation: InstallationState;
  onOpen: (tool: CatalogTool, trigger: HTMLButtonElement) => void;
  onInstall: (tool: CatalogTool) => void;
  /** Position in its category, used to stagger the entry animation. */
  index?: number;
};

/** English here, translated where it is shown. */
const phaseLabels: Record<InstallationState["phase"], string> = {
  idle: "",
  resolving: "Preparing",
  downloading: "Downloading",
  verifying: "Verifying",
  installing: "Installing",
};

export function ToolCard({ tool, installation, onOpen, onInstall, index = 0 }: ToolCardProps) {
  const t = useT();
  const isBusy = installation.phase !== "idle";
  const isReady = installation.availability === "ready";
  const progress = Math.round((installation.progress ?? 0) * 100);
  const readyLabel =
    t(installation.activeVersion === "bundled" ? "Included" : "Ready");

  return (
    <article
      className={`tool-card tool-card--${tool.accent}`}
      // Capped so a six-card category never feels like it is loading.
      style={{ "--card-delay": `${Math.min(index, 5) * 45}ms` } as CSSProperties}
    >
      <ToolArtwork toolId={tool.id} label={tool.integrationName} />
      <span className={`availability availability--${isReady ? "ready" : "available"}`}>
        {isReady ? <Check size={12} aria-hidden="true" /> : <Download size={12} aria-hidden="true" />}
        {isReady ? readyLabel : t(tool.downloadLabel ?? "Not installed")}
      </span>

      <div className="tool-card__content">
        <div className="tool-card__copy">
          <h3>{t(tool.title)}</h3>
          <p>{t(tool.description)}</p>
        </div>

        {installation.lastError ? (
          <div className="install-error" role="alert">
            <span>{installation.lastError}</span>
            <button className="button button--light button--small" type="button" onClick={() => onInstall(tool)}>
              {t("Try again")}
            </button>
          </div>
        ) : isBusy ? (
          <div className="install-progress" aria-live="polite">
            <div className="install-progress__line">
              <span>{t(phaseLabels[installation.phase])}</span>
              {installation.phase === "downloading" && <span>{progress}%</span>}
            </div>
            <div
              className={`progress-track ${installation.progress === null ? "progress-track--indeterminate" : ""}`}
              role="progressbar"
              aria-label={t("Progress of {name}", { name: tool.integrationName })}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={installation.progress === null ? undefined : progress}
            >
              <span style={{ inlineSize: installation.progress === null ? undefined : `${progress}%` }} />
            </div>
            {installation.phase !== "installing" && (
              <span className="install-progress__note">{t("Waiting for the host to finish.")}</span>
            )}
          </div>
        ) : (
          <button
            className={`button ${isReady ? "button--light" : "button--primary"}`}
            type="button"
            onClick={(event) => (isReady ? onOpen(tool, event.currentTarget) : onInstall(tool))}
            aria-label={t(isReady ? "Open {name}" : "Get {name}", { name: tool.integrationName })}
          >
            {t(isReady ? "Open" : "Get it")}
            <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}
