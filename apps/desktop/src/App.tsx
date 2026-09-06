import { useEffect, useMemo, useRef, useState } from "react";
import {
  Clock3,
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
import { ToolPanel } from "./components/ToolPanel";
import { ToolRail } from "./components/ToolRail";
import { useJobQueue, type ToolJob } from "./domain/job-queue";
import { useInstallationState } from "./hooks/useInstallationState";
import "./styles/app.css";

type NavigationId = "catalog" | "queue" | "history" | "settings";

function WorkbenchMark() {
  return (
    <svg className="app-mark__logo" viewBox="0 0 64 64" role="img" aria-label="Workbench">
      <path d="M12 15 20 49 32 29 44 49 52 15" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
      <path d="M26 33h12" fill="none" stroke="var(--action)" strokeLinecap="round" strokeWidth="4" />
      <circle cx="32" cy="33" r="3.5" fill="var(--action)" />
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
  const [pendingTool, setPendingTool] = useState<CatalogTool | null>(null);
  const [pendingFile, setPendingFile] = useState<string | null>(null);
  const [fileMessage, setFileMessage] = useState("");
  const installations = useInstallationState();
  const jobs = useJobQueue();
  const searchRef = useRef<HTMLInputElement>(null);
  const toolTriggerRef = useRef<HTMLButtonElement | null>(null);

  const visibleRows = useMemo(() => filterCatalogRows(catalogRows, query), [catalogRows, query]);
  const installationPlan = pendingTool ? installations.planInstallation(pendingTool.id) : [];
  const labelsById = useMemo(
    () => Object.fromEntries(toolManifest.tools.map((tool) => [tool.id, tool.displayName])),
    [],
  );

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
    setSelectedTool(tool);
  }

  function closeTool() {
    setSelectedTool(null);
    window.setTimeout(() => toolTriggerRef.current?.focus(), 0);
  }

  function requestInstallation(tool: CatalogTool) {
    setPendingTool(tool);
  }

  function queueToolJob(input: { operationLabel: string; sourceLabel: string; options: Record<string, string>; completed: boolean }) {
    if (!selectedTool) return;
    jobs.enqueueJob({
      toolId: selectedTool.id,
      toolName: selectedTool.title,
      operationLabel: input.operationLabel,
      sourceLabel: input.sourceLabel,
      options: input.options,
    }, input.completed ? "succeeded" : "queued");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="app-mark" aria-label="Workbench">
          <span className="app-mark__symbol"><WorkbenchMark /></span>
          <span>
            <strong>Workbench</strong>
            <small>Ferramentas locais</small>
          </span>
        </div>

        <nav aria-label="Navegação principal">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={activeNavigation === item.id ? "nav-item nav-item--active" : "nav-item"}
                onClick={() => setActiveNavigation(item.id)}
                aria-label={item.label}
                title={item.label}
                aria-current={activeNavigation === item.id ? "page" : undefined}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar__status">
          <span className="status-light" />
          <span>
            <strong>Windows x64</strong>
            <small>Execução local habilitada</small>
          </span>
        </div>
      </aside>

      <main className="workspace">
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
            <kbd>Ctrl K</kbd>
          </div>
          <button className="button button--quiet topbar__action" type="button" onClick={() => setActiveNavigation("history")}>
            <Clock3 size={16} /> {jobs.completedJobs.length} resultado(s)
          </button>
        </header>

        {activeNavigation === "catalog" ? (
          <div className="catalog-view">
            <section className="drop-workspace" aria-labelledby="workspace-title">
              <div className="drop-workspace__copy">
                <h1 id="workspace-title">O que você quer fazer?</h1>
                <p>
                  Escolha uma ferramenta abaixo. Você também pode selecionar o arquivo primeiro.
                </p>
              </div>
              <button
                type="button"
                className="file-drop"
                onClick={async () => {
                  if (!("__TAURI_INTERNALS__" in window)) {
                    setFileMessage("Abra o Workbench no Windows para escolher arquivos locais.");
                    return;
                  }
                  try {
                    const selected = await open({ multiple: false, directory: false });
                    if (typeof selected === "string") { setPendingFile(selected); setFileMessage(""); }
                  } catch (error) { setFileMessage(String(error)); }
                }}
              >
                <Upload size={23} />
                <span>
                  <strong>{pendingFile?.split(/[\\/]/).pop() ?? "Escolher arquivo"}</strong>
                  <small>{pendingFile ? "Agora abra uma ferramenta abaixo" : "Processamento no seu computador"}</small>
                </span>
              </button>
              {fileMessage && <p role="alert">{fileMessage}</p>}
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
                <Search size={24} />
                <h2>Nenhuma ferramenta encontrada</h2>
                <p>Tente uma ação como “converter”, uma extensão como “.pdf” ou o nome da ferramenta.</p>
                <button className="button button--light" type="button" onClick={() => setQuery("")}>Limpar busca</button>
              </section>
            )}
          </div>
        ) : (
          <JobView
            activeNavigation={activeNavigation}
            activeJobs={jobs.activeJobs}
            completedJobs={jobs.completedJobs}
            onReturn={() => setActiveNavigation("catalog")}
          />
        )}
      </main>

      {pendingTool && (
        <InstallDialog
          tool={pendingTool}
          plan={installationPlan}
          labelsById={labelsById}
          onClose={() => setPendingTool(null)}
        />
      )}
      {selectedTool && <ToolPanel key={selectedTool.id} tool={selectedTool} initialPath={pendingFile} onClose={closeTool} onQueue={queueToolJob} />}
    </div>
  );
}

function JobView({ activeNavigation, activeJobs, completedJobs, onReturn }: { activeNavigation: Exclude<NavigationId, "catalog">; activeJobs: ToolJob[]; completedJobs: ToolJob[]; onReturn: () => void }) {
  if (activeNavigation === "settings") {
    return <PlaceholderView title="Ajustes preparados" description="Destino padrão, conflitos, concorrência e atualizações entram na próxima integração." onReturn={onReturn} />;
  }

  const jobs = activeNavigation === "queue" ? activeJobs : completedJobs;
  const title = activeNavigation === "queue" ? "Fila de operações" : "Histórico de resultados";
  const emptyTitle = activeNavigation === "queue" ? "Fila vazia" : "Nenhum resultado ainda";
  const emptyDescription = activeNavigation === "queue" ? "Execute uma operação pelo painel da ferramenta. Fila em segundo plano e cancelamento ainda não estão disponíveis." : "As operações concluídas nesta sessão aparecem aqui.";

  return (
    <section className="job-view">
      <div className="job-view__header"><span className="placeholder-view__line" /><h1>{title}</h1><p>{jobs.length ? `${jobs.length} operação(ões) nesta seção.` : emptyDescription}</p></div>
      {jobs.length ? <div className="job-list">{jobs.map((job) => <JobRow key={job.id} job={job} />)}</div> : <div className="job-empty"><h2>{emptyTitle}</h2><p>{emptyDescription}</p><button className="button button--light" type="button" onClick={onReturn}>Voltar às ferramentas</button></div>}
    </section>
  );
}

function JobRow({ job }: { job: ToolJob }) {
  const progress = Math.round(job.progress * 100);
  const optionsLabel = Object.entries(job.options).map(([key, value]) => `${key}: ${value}`).join(" · ");
  return <article className="job-row" aria-label={`${job.operationLabel} — ${job.toolName}`}><div><strong>{job.operationLabel}</strong><span>{job.toolName} · {job.sourceLabel}{optionsLabel ? ` · ${optionsLabel}` : ""}</span></div><div className="job-row__status"><span>{job.status === "queued" ? "Na fila" : job.status === "running" ? `Executando ${progress}%` : "Concluída"}</span>{job.status !== "succeeded" && <div className="progress-track"><span style={{ inlineSize: `${progress}%` }} /></div>}</div></article>;
}

function PlaceholderView({ title, description, onReturn }: { title: string; description: string; onReturn: () => void }) {
  return (
    <section className="placeholder-view">
      <span className="placeholder-view__line" />
      <h1>{title}</h1>
      <p>{description}</p>
      <button className="button button--light" type="button" onClick={onReturn}>Voltar às ferramentas</button>
    </section>
  );
}
