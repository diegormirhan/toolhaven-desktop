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
  { id: "catalog", label: "Tools", icon: Grid2X2 },
  { id: "queue", label: "Queue", icon: ListTodo },
  { id: "history", label: "History", icon: FolderClock },
  { id: "settings", label: "Settings", icon: Settings },
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
            <small>Local tools</small>
          </span>
        </div>

        <nav aria-label="Main navigation">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const badge = item.id === "queue" ? runningCount : 0;
            return (
              <button
                key={item.id}
                type="button"
                className={activeNavigation === item.id ? "nav-item nav-item--active" : "nav-item"}
                onClick={() => setActiveNavigation(item.id)}
                aria-label={badge > 0 ? `${item.label}, ${badge} running` : item.label}
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
            <small>Local execution enabled</small>
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
              placeholder="Search an action, a format or a tool"
              aria-label="Search tools"
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
              <Clock3 size={16} aria-hidden="true" /> History · {runner.finishedJobs.length}
            </button>
          </div>
        </header>

        {activeNavigation === "catalog" ? (
          <div className="catalog-view">
            <section className="drop-workspace" aria-labelledby="workspace-title">
              <div className="drop-workspace__copy">
                <h1 id="workspace-title">What do you want to do?</h1>
                <p>
                  Pick a tool below. You can also drop a file onto this window, or choose one first.
                </p>
              </div>
              <button
                type="button"
                className="file-drop"
                data-dragging={fileDrop.isDraggingOver ? "true" : undefined}
                onClick={async () => {
                  if (!isNativeHost()) {
                    setFileMessage("Open ToolHaven on Windows to pick local files.");
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
                      ? "Drop the file here"
                      : (pendingFile?.split(/[\\/]/).pop() ?? "Drop a file, or choose one")}
                  </strong>
                  <small>{pendingFile ? "Now open a tool below" : "Processed on your own machine"}</small>
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
                <h2>No tool matches that</h2>
                <p>Try an action like “convert”, an extension like “.pdf”, or the name of the tool.</p>
                <button className="button button--light" type="button" onClick={() => setQuery("")}>
                  Clear search
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
  const title = isQueue ? "Operation queue" : "Result history";
  const emptyTitle = isQueue ? "Nothing running" : "No results yet";
  const emptyDescription = isQueue
    ? "An operation started from a tool panel keeps running here after you close the panel. Cancelling is not available yet."
    : "Operations from this session, finished or failed, show up here.";
  const lead = jobs.length
    ? `${jobs.length} operation${jobs.length === 1 ? "" : "s"} in this section.`
    : isQueue
      ? "Nothing is running right now."
      : "Nothing finished in this session.";

  return (
    <section className="job-view">
      <div className="job-view__header">
        <span className="placeholder-view__line" aria-hidden="true" />
        <h1>{title}</h1>
        <p>{lead}</p>
        {!isQueue && jobs.length > 0 && (
          <button className="button button--quiet button--small" type="button" onClick={onClearHistory}>
            Clear this session
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
            Back to the tools
          </button>
        </div>
      )}
    </section>
  );
}

const statusLabels: Record<ToolJob["status"], string> = {
  running: "Running",
  succeeded: "Done",
  failed: "Failed",
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
              <Copy size={13} aria-hidden="true" /> {copied ? "Copied" : "Copy path"}
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
            aria-label={`Progress of ${job.operationLabel}`}
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
        <h1>Settings</h1>
        <p>What this version can already configure lives here. The rest stays explicitly pending.</p>
      </div>

      <div className="settings-card">
        <div className="settings-card__copy">
          <h2>Theme</h2>
          <p>“System” follows the Windows preference. Your choice is saved on this machine.</p>
        </div>
        <ThemeSwitch preference={preference} onChange={onThemeChange} variant="labelled" />
      </div>

      <div className="settings-card settings-card--pending">
        <div className="settings-card__copy">
          <h2>Not available yet</h2>
          <ul>
            <li>Default destination, conflict policy and concurrency limit.</li>
            <li>Cancelling an operation that is already running.</li>
            <li>A queue and history that survive a restart.</li>
            <li>In-app download for the four tools that are still pinned by hand.</li>
          </ul>
        </div>
      </div>

      <button className="button button--light" type="button" onClick={onReturn}>
        Back to the tools
      </button>
    </section>
  );
}
