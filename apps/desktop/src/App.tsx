import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CircleSlash,
  Clock3,
  Copy,
  FolderClock,
  Grid2X2,
  ListTodo,
  Search,
  Settings,
  Upload,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import toolManifest from "../../../tooling/tools.json";
import { NumberField } from "./components/NumberField";
import { Select } from "./components/Select";
import { open } from "@tauri-apps/plugin-dialog";
import { createCatalogRows, filterCatalogRows, type CatalogTool } from "./catalog/catalog";
import { InstallDialog } from "./components/InstallDialog";
import { ThemeSwitch } from "./components/ThemeSwitch";
import { ToolPanel, type RunOperationInput } from "./components/ToolPanel";
import { ImageSearchPanel } from "./components/ImageSearchPanel";
import { UpdateCard } from "./components/UpdateCard";
import { useUpdate, type UpdateState } from "./hooks/useUpdate";
import { MusicPanel } from "./components/MusicPanel";
import { ToolSection } from "./components/ToolSection";
import { CategoryFilter } from "./components/CategoryFilter";
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
  const [concurrency, setConcurrency] = useState(() => readNumberSetting("toolhaven.concurrency", 2));
  const [conflictPolicy, setConflictPolicy] = useState(
    () => readSetting("toolhaven.conflict") || "keep-both",
  );
  const runner = useOperationRunner({ concurrency, conflictPolicy });
  const update = useUpdate();

  useEffect(() => writeSetting("toolhaven.concurrency", String(concurrency)), [concurrency]);
  useEffect(() => writeSetting("toolhaven.conflict", conflictPolicy), [conflictPolicy]);
  const searchRef = useRef<HTMLInputElement>(null);
  const toolTriggerRef = useRef<HTMLButtonElement | null>(null);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [panelDirty, setPanelDirty] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);
  // Remembered per machine: someone who works with the sidebar collapsed does
  // not want to collapse it again every launch.
  const [defaultFolder, setDefaultFolder] = useState(() => {
    try {
      return localStorage.getItem('toolhaven.destination') ?? '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('toolhaven.destination', defaultFolder);
    } catch {
      /* A blocked store is not worth failing a render over. */
    }
  }, [defaultFolder]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("toolhaven.sidebar") === "collapsed";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("toolhaven.sidebar", sidebarCollapsed ? "collapsed" : "expanded");
    } catch {
      /* A blocked store is not worth failing a render over. */
    }
  }, [sidebarCollapsed]);
  const searchedRows = useMemo(() => filterCatalogRows(catalogRows, query), [catalogRows, query]);
  // A search spans every category, so narrowing by category on top of it would
  // hide matches the user just asked for.
  const visibleRows = useMemo(
    () =>
      query.trim() || activeCategory === null
        ? searchedRows
        : searchedRows.filter((row) => row.id === activeCategory),
    [searchedRows, activeCategory, query],
  );
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
  /**
   * Asks first when there is work to lose.
   *
   * Deliberately takes no arguments: it is passed straight to onClick in
   * places, and a "force" parameter would quietly receive the click event —
   * which is truthy, so every X button would skip the question. Forcing is a
   * separate function instead of a flag nobody can see being set.
   */
  function closeTool() {
    if (!selectedTool || panelLeaving) return;
    if (panelDirty) {
      setConfirmingClose(true);
      return;
    }
    discardAndClose();
  }

  function discardAndClose() {
    if (!selectedTool || panelLeaving) return;
    setConfirmingClose(false);
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
    <div className={`app-shell${sidebarCollapsed ? " app-shell--narrow" : ""}`}>
      <aside className="sidebar" aria-hidden={sidebarCollapsed ? undefined : undefined}>
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
          <button
            type="button"
            className="icon-button sidebar-toggle"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            aria-pressed={sidebarCollapsed}
            aria-label={sidebarCollapsed ? "Show the sidebar" : "Hide the sidebar"}
            title={sidebarCollapsed ? "Show the sidebar" : "Hide the sidebar"}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
          </button>
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

            {!query.trim() && (
              <CategoryFilter rows={searchedRows} active={activeCategory} onChange={setActiveCategory} />
            )}

            {visibleRows.length > 0 ? (
              <div className="catalog-rows">
                {visibleRows.map((row) => (
                  <ToolSection
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
            sidebarCollapsed={sidebarCollapsed}
            onSidebarChange={setSidebarCollapsed}
            defaultFolder={defaultFolder}
            onDefaultFolderChange={setDefaultFolder}
            concurrency={concurrency}
            onConcurrencyChange={setConcurrency}
            conflictPolicy={conflictPolicy}
            onConflictPolicyChange={setConflictPolicy}
            version={update.version}
            updateState={update.state}
            onCheckForUpdates={update.checkNow}
            finishedCount={runner.finishedJobs.length}
            onClearHistory={runner.clearHistory}
            onReturn={() => setActiveNavigation("catalog")}
          />
        ) : (
          <JobView
            activeNavigation={activeNavigation}
            runningJobs={runner.runningJobs}
            finishedJobs={runner.finishedJobs}
            onClearHistory={runner.clearFinishedJobs}
            onCancel={runner.cancelOperation}
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
      <UpdateCard state={update.state} onRestart={update.restart} onDismiss={update.dismiss} />
      {selectedTool && (
        <>
          <div
            className="panel-scrim"
            role="presentation"
            data-leaving={panelLeaving ? "true" : undefined}
            onMouseDown={closeTool}
          />
          {confirmingClose && (
            <div className="confirm-layer" role="presentation">
              <div className="confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="confirm-close-title">
                <h2 id="confirm-close-title">Discard this work?</h2>
                <p>The file you chose and the settings you changed will be cleared. Nothing on disk is touched either way.</p>
                <div className="dialog-actions">
                  <button className="button button--light" type="button" autoFocus onClick={() => setConfirmingClose(false)}>
                    Keep editing
                  </button>
                  <button className="button button--primary" type="button" onClick={discardAndClose}>
                    Discard
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedTool.id === "image-search" ? (
            <ImageSearchPanel
              key={selectedTool.id}
              tool={selectedTool}
              initialPath={pendingFile}
              droppedPaths={fileDrop.droppedPaths}
              leaving={panelLeaving}
              onDirtyChange={setPanelDirty}
              onClose={closeTool}
              onExited={finishClosingTool}
            />
          ) : selectedTool.id === "songrec" ? (
            <MusicPanel
              key={selectedTool.id}
              tool={selectedTool}
              leaving={panelLeaving}
              onDirtyChange={setPanelDirty}
              onClose={closeTool}
              onExited={finishClosingTool}
            />
          ) : (
            <ToolPanel
              onDirtyChange={setPanelDirty}
              key={selectedTool.id}
              tool={selectedTool}
              initialPath={pendingFile}
              droppedPaths={fileDrop.droppedPaths}
              jobs={runner.jobs}
              defaultFolder={defaultFolder}
              leaving={panelLeaving}
              onClose={closeTool}
              onExited={finishClosingTool}
              onRun={runToolOperation}
              onCancel={runner.cancelOperation}
            />
          )}
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
  onCancel,
  onReturn,
}: {
  activeNavigation: "queue" | "history";
  runningJobs: ToolJob[];
  finishedJobs: ToolJob[];
  onClearHistory: () => void;
  onCancel: (jobId: string) => void;
  onReturn: () => void;
}) {
  const isQueue = activeNavigation === "queue";
  const jobs = isQueue ? runningJobs : finishedJobs;
  const title = isQueue ? "Operation queue" : "Result history";
  const emptyTitle = isQueue ? "Nothing running" : "No results yet";
  const emptyDescription = isQueue
    ? "An operation started from a tool panel keeps running here after you close the panel, and can be stopped from here."
    : "Everything this app has run, kept across restarts until you clear it.";
  const lead = jobs.length
    ? `${jobs.length} operation${jobs.length === 1 ? "" : "s"} in this section.`
    : isQueue
      ? "Nothing is running right now."
      : "Nothing has finished yet.";

  return (
    <section className="job-view">
      <div className="job-view__header">
        <span className="placeholder-view__line" aria-hidden="true" />
        <h1>{title}</h1>
        <p>{lead}</p>
        {!isQueue && jobs.length > 0 && (
          <button className="button button--quiet button--small" type="button" onClick={onClearHistory}>
            Clear the history
          </button>
        )}
      </div>
      {jobs.length ? (
        <div className="job-list">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} onCancel={isQueue ? onCancel : undefined} />
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
  queued: "Waiting",
  running: "Running",
  succeeded: "Done",
  failed: "Failed",
  cancelled: "Stopped",
  interrupted: "Interrupted",
};

function JobRow({ job, onCancel }: { job: ToolJob; onCancel?: (jobId: string) => void }) {
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
          {(job.status === "failed" || job.status === "interrupted") && (
            <AlertTriangle size={13} aria-hidden="true" />
          )}
          {(job.status === "cancelled" || job.status === "queued") && (
            <CircleSlash size={13} aria-hidden="true" />
          )}
          {statusLabels[job.status]}
          {job.status === "running" && percentage != null ? ` ${percentage}%` : ""}
        </span>
        {onCancel && (job.status === "running" || job.status === "queued") && (
          <button
            className="button button--quiet button--small"
            type="button"
            onClick={() => onCancel(job.id)}
          >
            <CircleSlash size={13} aria-hidden="true" /> Stop
          </button>
        )}
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
  sidebarCollapsed,
  onSidebarChange,
  defaultFolder,
  onDefaultFolderChange,
  concurrency,
  onConcurrencyChange,
  conflictPolicy,
  onConflictPolicyChange,
  version,
  updateState,
  onCheckForUpdates,
  finishedCount,
  onClearHistory,
  onReturn,
}: {
  preference: ThemePreference;
  onThemeChange: (preference: ThemePreference) => void;
  sidebarCollapsed: boolean;
  onSidebarChange: (collapsed: boolean) => void;
  defaultFolder: string;
  onDefaultFolderChange: (folder: string) => void;
  concurrency: number;
  onConcurrencyChange: (value: number) => void;
  conflictPolicy: string;
  onConflictPolicyChange: (value: string) => void;
  version: string;
  updateState: UpdateState;
  onCheckForUpdates: () => Promise<void>;
  finishedCount: number;
  onClearHistory: () => void;
  onReturn: () => void;
}) {
  const answer = updateMessage(updateState);

  return (
    <section className="settings-view">
      <div className="job-view__header">
        <span className="placeholder-view__line" aria-hidden="true" />
        <h1>Settings</h1>
      </div>

      <div className="settings-card">
        <div className="settings-card__copy">
          <h2>Version</h2>
          {answer && <p>{answer}</p>}
        </div>
        <div className="settings-card__control">
          <span className="settings-card__path">{version ? `ToolHaven ${version}` : "—"}</span>
          <button
            className="button button--light"
            type="button"
            onClick={() => void onCheckForUpdates()}
            disabled={updateState.phase === "checking" || updateState.phase === "downloading"}
          >
            {updateState.phase === "checking" ? "Checking…" : "Check now"}
          </button>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card__copy">
          <h2>Theme</h2>
        </div>
        <ThemeSwitch preference={preference} onChange={onThemeChange} variant="labelled" />
      </div>

      <div className="settings-card">
        <div className="settings-card__copy">
          <h2>Sidebar</h2>
        </div>
        <button
          className="button button--light"
          type="button"
          onClick={() => onSidebarChange(!sidebarCollapsed)}
          aria-pressed={sidebarCollapsed}
        >
          {sidebarCollapsed ? "Show it" : "Hide it"}
        </button>
      </div>

      <div className="settings-card">
        <div className="settings-card__copy">
          <h2>Default destination</h2>
        </div>
        <div className="settings-card__control">
          <span className="settings-card__path">{defaultFolder || "Not set"}</span>
          <button
            className="button button--light"
            type="button"
            onClick={() => {
              void open({ directory: true, multiple: false })
                .then((selected) => {
                  if (typeof selected === "string") onDefaultFolderChange(selected);
                })
                .catch(() => undefined);
            }}
          >
            Choose
          </button>
          {defaultFolder && (
            <button className="button button--light" type="button" onClick={() => onDefaultFolderChange("")}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card__copy">
          <h2>History</h2>
          <p>
            {finishedCount > 0
              ? `${finishedCount} finished operation${finishedCount === 1 ? "" : "s"}`
              : "Nothing has finished yet"}
          </p>
        </div>
        <button
          className="button button--light"
          type="button"
          onClick={onClearHistory}
          disabled={finishedCount === 0}
        >
          Clear
        </button>
      </div>

      <div className="settings-card">
        <div className="settings-card__copy">
          <h2>How many at once</h2>
          <p>The rest wait their turn in the queue.</p>
        </div>
        <div className="settings-card__control">
          <NumberField
            label="Operations at once"
            value={String(concurrency)}
            min={1}
            max={8}
            onChange={(value) => onConcurrencyChange(Math.min(8, Math.max(1, Number(value) || 1)))}
          />
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card__copy">
          <h2>When the file already exists</h2>
        </div>
        <div className="settings-card__control settings-card__control--wide">
          <Select
            label="When the file already exists"
            value={conflictPolicy}
            choices={[
              { value: "keep-both", label: "Keep both — number the new one" },
              { value: "overwrite", label: "Overwrite the old one" },
            ]}
            onChange={onConflictPolicyChange}
          />
        </div>
      </div>

      <div className="settings-card settings-card--pending">
        <div className="settings-card__copy">
          <h2>Not available yet</h2>
          <ul>
            <li>Pausing an operation, rather than stopping it</li>
            <li>Scheduling one for later</li>
          </ul>
        </div>
      </div>

      <button className="button button--light" type="button" onClick={onReturn}>
        Back to the tools
      </button>
    </section>
  );
}

/** What the last check found, in the one sentence the card has room for. */
function updateMessage(state: UpdateState): string {
  switch (state.phase) {
    case "current":
      return "This is the newest version.";
    case "downloading":
      return "A newer version is downloading.";
    case "ready":
      return `Version ${state.version} is ready — restart to use it.`;
    case "failed":
      return `The last check failed: ${state.message}`;
    default:
      return "";
  }
}

/** Reads a saved setting, tolerating a storage that refuses to answer. */
function readSetting(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function readNumberSetting(key: string, fallback: number): number {
  const value = Number(readSetting(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function writeSetting(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // A blocked store costs the preference, never the session.
  }
}
