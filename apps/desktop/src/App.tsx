import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock3,
  Copy,
  FolderClock,
  Grid2X2,
  ListTodo,
  Search,
  Settings,
  Upload,
} from "lucide-react";
import toolManifest from "../../../tooling/tools.json";
import { open } from "@tauri-apps/plugin-dialog";
import { createCatalogRows, filterCatalogRows, type CatalogTool } from "./catalog/catalog";
import { InstallDialog } from "./components/InstallDialog";
import { ThemeSwitch } from "./components/ThemeSwitch";
import { ToolPanel, type RunOperationInput } from "./components/ToolPanel";
import { ToolRail } from "./components/ToolRail";
import type { ToolJob } from "./domain/job-queue";
import { useFileDrop } from "./hooks/useFileDrop";
import { isNativeHost, useOperationRunner } from "./hooks/useOperationRunner";
import { useInstallationState } from "./hooks/useInstallationState";
import { useTheme, type ThemePreference } from "./hooks/useTheme";
import "./styles/app.css";

type NavigationId = "catalog" | "queue" | "history" | "settings";

/** Same geometry as the installed app icon, so the sidebar and the taskbar agree. */
function ToolHavenMark() {
  return (
    <svg className="app-mark__logo" viewBox="0 0 64 64" role="img" aria-label="ToolHaven">
      <path
        d="M20 43 L20 26 A12 12 0 0 1 44 26 L44 43"
        fill="none"
        stroke="var(--brand-arch)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="5.25"
      />
      <path d="M15.6 49.5 H48.4" fill="none" stroke="var(--brand-base)" strokeLinecap="round" strokeWidth="2.75" />
    </svg>
  );
}

const navigationItems: Array<{ id: NavigationId; label: string; icon: typeof Grid2X2 }> = [
  { id: "catalog", label: "Ferramentas", icon: Grid2X2 },
  { id: "queue", label: "Fila", icon: ListTodo },
  { id: "history", label: "Histórico", icon: FolderClock },
  { id: "settings", label: "Ajustes", icon: Settings },
];

export function App() {
  const catalogRows = useMemo(() => createCatalogRows(), []);
  const [activeNavigation, setActiveNavigation] = useState<NavigationId>("catalog");
  const [query, setQuery] = useState("");
  const [selectedTool, setSelectedTool] = useState<CatalogTool | null>(null);
  const [panelLeaving, setPanelLeaving] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pendingTool, setPendingTool] = useState<CatalogTool | null>(null);
  const [pendingFile, setPendingFile] = useState<string | null>(null);
  const [fileMessage, setFileMessage] = useState("");
  const installations = useInstallationState();
  const fileDrop = useFileDrop();
  const theme = useTheme();
  const runner = useOperationRunner();
  const searchRef = useRef<HTMLInputElement>(null);
  const toolTriggerRef = useRef<HTMLButtonElement | null>(null);

  const visibleRows = useMemo(() => filterCatalogRows(catalogRows, query), [catalogRows, query]);
  const installationPlan = pendingTool ? installations.planInstallation(pendingTool.id) : [];
  const pinnedToolIds = useMemo(
    () => new Set(toolManifest.tools.filter((tool) => tool.status === "downloadable").map((tool) => tool.id)),
    [],
  );
  const labelsById = useMemo(
    () => Object.fromEntries(toolManifest.tools.map((tool) => [tool.id, tool.displayName])),
    [],
  );
  const runningCount = runner.runningJobs.length;

  useEffect(() => {
    function closeOverlay(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (pendingTool) setPendingTool(null);
      else closeTool();
    }
    window.addEventListener("keydown", closeOverlay);
    return () => window.removeEventListener("keydown", closeOverlay);
  }, [pendingTool]);

  useEffect(() => {
    if (fileDrop.droppedPaths.length === 0) return;
    setFileMessage("");
    if (!selectedTool) setPendingFile(fileDrop.droppedPaths[0]!);
  }, [fileDrop.droppedPaths]);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  function openTool(tool: CatalogTool, trigger: HTMLButtonElement) {
    toolTriggerRef.current = trigger;
    setPanelLeaving(false);
    setSelectedTool(tool);
  }

  /** The panel leaves along the path it arrived on, so it is unmounted only after the exit. */
  function closeTool() {
    if (!selectedTool || panelLeaving) return;
    setPanelLeaving(true);
    window.setTimeout(() => toolTriggerRef.current?.focus(), 0);
  }

  function finishClosingTool() {
    setSelectedTool(null);
    setPanelLeaving(false);
  }

  function requestInstallation(tool: CatalogTool) {
    setPendingTool(tool);
  }

  function runToolOperation(input: RunOperationInput): string {
    return runner.runOperation(input.request, {
      toolName: input.toolName,
      operationLabel: input.operationLabel,
      sourceLabel: input.sourceLabel,
      options: Object.fromEntries(Object.entries(input.request.options).filter(([key]) => key !== "password")),
    });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="app-mark">
          <span className="app-mark__symbol" aria-hidden="true">
            <ToolHavenMark />
          </span>
          <span>
            <strong>ToolHaven</strong>
            <small>Ferramentas locais</small>
          </span>
        </div>

        <nav aria-label="Navegação principal">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const badge = item.id === "queue" ? runningCount : 0;
            return (
              <button
                key={item.id}
                type="button"
                className={activeNavigation === item.id ? "nav-item nav-item--active" : "nav-item"}
                onClick={() => setActiveNavigation(item.id)}
                aria-label={badge > 0 ? `${item.label}, ${badge} em execução` : item.label}
                title={item.label}
                aria-current={activeNavigation === item.id ? "page" : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
                {badge > 0 && (
                  <span className="nav-item__badge" aria-hidden="true">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar__status">
          <span className="status-light" aria-hidden="true" />
          <span>
            <strong>Windows x64</strong>
            <small>Execução local habilitada</small>
          </span>
        </div>
      </aside>

      <main
        className="workspace"
        data-scrolled={scrolled ? "true" : undefined}
        onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 4)}
      >
        <header className="topbar">
          <div className="search-control">
            <Search size={18} aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Busque uma ação, formato ou ferramenta"
              aria-label="Buscar ferramentas"
            />
            <kbd aria-hidden="true">Ctrl K</kbd>
          </div>
          <div className="topbar__tools">
            <ThemeSwitch preference={theme.preference} onChange={theme.setPreference} />
            <button
              className="button button--quiet topbar__action"
              type="button"
              onClick={() => setActiveNavigation("history")}
            >
              <Clock3 size={16} aria-hidden="true" /> Histórico · {runner.finishedJobs.length}
            </button>
          </div>
        </header>

        {activeNavigation === "catalog" ? (
          <div className="catalog-view">
            <section className="drop-workspace" aria-labelledby="workspace-title">
              <div className="drop-workspace__copy">
                <h1 id="workspace-title">O que você quer fazer?</h1>
                <p>
                  Escolha uma ferramenta abaixo. Você também pode arrastar um arquivo para esta janela
                  ou selecioná-lo primeiro.
                </p>
              </div>
              <button
                type="button"
                className="file-drop"
                data-dragging={fileDrop.isDraggingOver ? "true" : undefined}
                onClick={async () => {
                  if (!isNativeHost()) {
                    setFileMessage("Abra o ToolHaven no Windows para escolher arquivos locais.");
                    return;
                  }
                  try {
                    const selected = await open({ multiple: false, directory: false });
                    if (typeof selected === "string") {
                      setPendingFile(selected);
                      setFileMessage("");
                    }
                  } catch (error) {
                    setFileMessage(String(error));
                  }
                }}
              >
                <Upload size={23} aria-hidden="true" />
                <span>
                  <strong>
                    {fileDrop.isDraggingOver
                      ? "Solte o arquivo aqui"
                      : (pendingFile?.split(/[\\/]/).pop() ?? "Arraste um arquivo ou escolha")}
                  </strong>
                  <small>{pendingFile ? "Agora abra uma ferramenta abaixo" : "Processamento no seu computador"}</small>
                </span>
              </button>
              {fileMessage && (
                <p className="drop-workspace__notice" role="alert">
                  {fileMessage}
                </p>
              )}
            </section>

            {visibleRows.length > 0 ? (
              <div className="catalog-rows">
                {visibleRows.map((row) => (
                  <ToolRail
                    key={row.id}
                    row={row}
                    installations={installations.states}
                    onOpen={openTool}
                    onInstall={requestInstallation}
                  />
                ))}
              </div>
            ) : (
              <section className="empty-state">
                <Search size={24} aria-hidden="true" />
                <h2>Nenhuma ferramenta encontrada</h2>
                <p>Tente uma ação como “converter”, uma extensão como “.pdf” ou o nome da ferramenta.</p>
                <button className="button button--light" type="button" onClick={() => setQuery("")}>
                  Limpar busca
                </button>
              </section>
            )}
          </div>
        ) : activeNavigation === "settings" ? (
          <SettingsView
            preference={theme.preference}
            onThemeChange={theme.setPreference}
            onReturn={() => setActiveNavigation("catalog")}
          />
        ) : (
          <JobView
            activeNavigation={activeNavigation}
            runningJobs={runner.runningJobs}
            finishedJobs={runner.finishedJobs}
            onClearHistory={runner.clearFinishedJobs}
            onReturn={() => setActiveNavigation("catalog")}
          />
        )}
      </main>

      {pendingTool && (
        <InstallDialog
          tool={pendingTool}
          plan={installationPlan}
          labelsById={labelsById}
          states={installations.states}
          canInstall={pinnedToolIds.has(pendingTool.id)}
          onInstall={() => void installations.installTool(pendingTool.id)}
          onClose={() => setPendingTool(null)}
        />
      )}
      {selectedTool && (
        <>
          <div
            className="panel-scrim"
            role="presentation"
            data-leaving={panelLeaving ? "true" : undefined}
            onMouseDown={closeTool}
          />
          <ToolPanel
            key={selectedTool.id}
            tool={selectedTool}
            initialPath={pendingFile}
            droppedPaths={fileDrop.droppedPaths}
            jobs={runner.jobs}
            leaving={panelLeaving}
            onClose={closeTool}
            onExited={finishClosingTool}
            onRun={runToolOperation}
          />
        </>
      )}
    </div>
  );
}

function JobView({
  activeNavigation,
  runningJobs,
  finishedJobs,
  onClearHistory,
  onReturn,
}: {
  activeNavigation: "queue" | "history";
  runningJobs: ToolJob[];
  finishedJobs: ToolJob[];
  onClearHistory: () => void;
  onReturn: () => void;
}) {
  const isQueue = activeNavigation === "queue";
  const jobs = isQueue ? runningJobs : finishedJobs;
  const title = isQueue ? "Fila de operações" : "Histórico de resultados";
  const emptyTitle = isQueue ? "Nenhuma operação em andamento" : "Nenhum resultado ainda";
  const emptyDescription = isQueue
    ? "Operações iniciadas no painel de uma ferramenta continuam aqui mesmo depois de você fechar o painel. Cancelamento ainda não está disponível."
    : "As operações concluídas ou com falha nesta sessão aparecem aqui.";
  const lead = jobs.length
    ? `${jobs.length} operação(ões) nesta seção.`
    : isQueue
      ? "Nada sendo executado agora."
      : "Nada concluído nesta sessão.";

  return (
    <section className="job-view">
      <div className="job-view__header">
        <span className="placeholder-view__line" aria-hidden="true" />
        <h1>{title}</h1>
        <p>{lead}</p>
        {!isQueue && jobs.length > 0 && (
          <button className="button button--quiet button--small" type="button" onClick={onClearHistory}>
            Limpar histórico da sessão
          </button>
        )}
      </div>
      {jobs.length ? (
        <div className="job-list">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="job-empty">
          <h2>{emptyTitle}</h2>
          <p>{emptyDescription}</p>
          <button className="button button--light" type="button" onClick={onReturn}>
            Voltar às ferramentas
          </button>
        </div>
      )}
    </section>
  );
}

const statusLabels: Record<ToolJob["status"], string> = {
  running: "Executando",
  succeeded: "Concluída",
  failed: "Falhou",
};

function JobRow({ job }: { job: ToolJob }) {
  const [copied, setCopied] = useState(false);
  const percentage = job.progress == null ? null : Math.round(job.progress * 100);
  const optionsLabel = Object.entries(job.options)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" · ");

  async function copyOutputPath() {
    if (!job.outputPath) return;
    try {
      await navigator.clipboard?.writeText(job.outputPath);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the path stays visible in the row.
    }
  }

  return (
    <article className={`job-row job-row--${job.status}`} aria-label={`${job.operationLabel} — ${job.toolName}`}>
      <div className="job-row__identity">
        <strong>{job.operationLabel}</strong>
        <span>
          {job.toolName} · {job.sourceLabel}
          {optionsLabel ? ` · ${optionsLabel}` : ""}
        </span>
        <span className="job-row__message">{job.message}</span>
        {job.outputPath && (
          <span className="job-row__output">
            <code>{job.outputPath}</code>
            <button className="button button--quiet button--small" type="button" onClick={() => void copyOutputPath()}>
              <Copy size={13} aria-hidden="true" /> {copied ? "Copiado" : "Copiar caminho"}
            </button>
          </span>
        )}
      </div>
      <div className="job-row__status">
        <span className="job-row__status-label">
          {job.status === "succeeded" && <Check size={13} aria-hidden="true" />}
          {job.status === "failed" && <AlertTriangle size={13} aria-hidden="true" />}
          {statusLabels[job.status]}
          {job.status === "running" && percentage != null ? ` ${percentage}%` : ""}
        </span>
        {job.status === "running" && (
          <div
            className={`progress-track${percentage == null ? " progress-track--indeterminate" : ""}`}
            role="progressbar"
            aria-label={`Progresso de ${job.operationLabel}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentage ?? undefined}
          >
            <span style={{ inlineSize: percentage == null ? undefined : `${percentage}%` }} />
          </div>
        )}
      </div>
    </article>
  );
}

function SettingsView({
  preference,
  onThemeChange,
  onReturn,
}: {
  preference: ThemePreference;
  onThemeChange: (preference: ThemePreference) => void;
  onReturn: () => void;
}) {
  return (
    <section className="settings-view">
      <div className="job-view__header">
        <span className="placeholder-view__line" aria-hidden="true" />
        <h1>Ajustes</h1>
        <p>O que já é configurável nesta versão fica aqui. O restante permanece explicitamente pendente.</p>
      </div>

      <div className="settings-card">
        <div className="settings-card__copy">
          <h2>Tema</h2>
          <p>“Sistema” acompanha a preferência do Windows. A escolha fica salva neste computador.</p>
        </div>
        <ThemeSwitch preference={preference} onChange={onThemeChange} variant="labelled" />
      </div>

      <div className="settings-card settings-card--pending">
        <div className="settings-card__copy">
          <h2>Ainda não disponível</h2>
          <ul>
            <li>Destino padrão, política de conflito e limite de concorrência.</li>
            <li>Cancelamento de operações em andamento.</li>
            <li>Fila e histórico persistidos entre reinícios.</li>
            <li>Download interno dos componentes pesados.</li>
          </ul>
        </div>
      </div>

      <button className="button button--light" type="button" onClick={onReturn}>
        Voltar às ferramentas
      </button>
    </section>
  );
}
