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
  resolving: "Preparando",
  downloading: "Baixando",
  verifying: "Verificando",
  installing: "Instalando",
};

export function ToolCard({ tool, installation, onOpen, onInstall }: ToolCardProps) {
  const isBusy = installation.phase !== "idle";
  const isReady = installation.availability === "ready";
  const progress = Math.round((installation.progress ?? 0) * 100);

  return (
    <article className={`tool-card tool-card--${tool.size} tool-card--${tool.accent}`}>
      <ToolArtwork toolId={tool.id} />
      <div className="tool-card__content">
        <div className="tool-card__meta">
          <span>{tool.integrationName}</span>
          <span className={`availability availability--${isReady ? "ready" : "available"}`}>
            {isReady ? <Check size={12} /> : <Download size={12} />}
            {isReady ? (installation.activeVersion === "system" ? "Disponível" : tool.delivery === "embedded" ? "Incluída" : "Pronta") : tool.downloadLabel ?? "Indisponível"}
          </span>
        </div>
        <div className="tool-card__copy">
          <h3>{tool.title}</h3>
          <p>{tool.description}</p>
        </div>

        {installation.lastError ? (
          <div className="install-error" role="alert">
            <span>{installation.lastError}</span>
            <button className="button button--light button--small" type="button" onClick={() => onInstall(tool)}>
              Tentar novamente
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
              aria-label={`Progresso de ${tool.integrationName}`}
              aria-valuenow={installation.progress === null ? undefined : progress}
            >
              <span style={{ inlineSize: installation.progress === null ? undefined : `${progress}%` }} />
            </div>
            {installation.phase !== "installing" && (
              <span className="install-progress__note">Aguarde o host concluir a operação.</span>
            )}
          </div>
        ) : (
          <button
            className={`button ${isReady ? "button--light" : "button--primary"}`}
            type="button"
            onClick={(event) => (isReady ? onOpen(tool, event.currentTarget) : onInstall(tool))}
            aria-label={`${isReady ? "Abrir" : "Ver disponibilidade de"} ${tool.integrationName}`}
          >
            {isReady ? "Abrir" : "Ver disponibilidade"}
            <ArrowUpRight size={16} />
          </button>
        )}
      </div>
    </article>
  );
}
