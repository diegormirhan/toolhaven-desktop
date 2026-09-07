import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, FilePlus2, FolderOpen, Play, X } from "lucide-react";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { CatalogTool } from "../catalog/catalog";
import { findJob, type ToolJob } from "../domain/job-queue";
import { isNativeHost, type OperationRequest } from "../hooks/useOperationRunner";

export type RunOperationInput = {
  request: OperationRequest;
  toolName: string;
  operationLabel: string;
  sourceLabel: string;
};

type ToolPanelProps = {
  tool: CatalogTool;
  initialPath?: string | null;
  droppedPaths?: string[];
  jobs?: ToolJob[];
  leaving?: boolean;
  onClose: () => void;
  onExited?: () => void;
  onRun?: (input: RunOperationInput) => string;
};

type SelectedFile = { name: string; path: string };

export function ToolPanel({ tool, initialPath, droppedPaths, jobs = [], leaving = false, onClose, onExited, onRun }: ToolPanelProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>(() =>
    initialPath && !["deno", "yt-dlp", ...folderTools].includes(tool.id)
      ? [{ path: initialPath, name: fileNameOnly(initialPath) }]
      : [],
  );
  const [selectedOperationId, setSelectedOperationId] = useState(tool.operations[0]?.id ?? "");
  const [sourceUrl, setSourceUrl] = useState("");
  const [operationOptions, setOperationOptions] = useState<Record<string, string>>({});
  const [outputPath, setOutputPath] = useState("");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const selectedOperation = tool.operations.find((operation) => operation.id === selectedOperationId);
  const selectedFileNames = selectedFiles.map((file) => file.name);
  const currentJob = findJob(jobs, currentJobId);
  const isRunning = currentJob?.status === "running";
  const needsTwoFiles = tool.id === "difftastic";
  const canRun =
    (needsTwoFiles ? selectedFiles.length >= 2 : selectedFiles.length > 0) ||
    (tool.id === "yt-dlp" && sourceUrl.trim().length > 0) ||
    (tool.id === "deno" && selectedOperationId === "runtime");
  const resultMessage = formError || (currentJob && currentJob.status !== "running" ? jobResultText(currentJob) : "");
  const resultIsError = Boolean(formError) || currentJob?.status === "failed";

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Reduced motion collapses the exit to ~1ms, so guarantee the unmount either way.
  useEffect(() => {
    if (!leaving || !onExited) return;
    const timeout = window.setTimeout(onExited, 320);
    return () => window.clearTimeout(timeout);
  }, [leaving, onExited]);

  // A file dropped on the window belongs to the tool the user already has open.
  useEffect(() => {
    if (!droppedPaths?.length || tool.id === "deno" || tool.id === "yt-dlp") return;
    setSelectedFiles(droppedPaths.map((path) => ({ path, name: fileNameOnly(path) })));
    setFormError("");
    setCurrentJobId(null);
  }, [droppedPaths, tool.id]);

  return (
    <aside
      className="tool-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="tool-panel-title"
      data-leaving={leaving ? "true" : undefined}
      onAnimationEnd={(event) => {
        if (leaving && event.animationName.includes("panel-exit")) onExited?.();
      }}
    >
      <div className="tool-panel__topbar">
        <span>{tool.integrationName}</span>
        <button
          ref={closeButtonRef}
          className="icon-button"
          type="button"
          onClick={onClose}
          aria-label="Close tool"
        >
          <X size={18} />
        </button>
      </div>
      <div className="tool-panel__body">
        <h2 id="tool-panel-title">{tool.title}</h2>
        <p>{tool.description}</p>

        {tool.operations.length > 0 && (
          <label className="operation-select">
            <span>Operation</span>
            <select
              aria-label="Operation"
              value={selectedOperationId}
              onChange={(event) => {
                setSelectedOperationId(event.target.value);
                setOperationOptions({});
                setOutputPath("");
                resetFeedback();
              }}
            >
              {tool.operations.map((operation) => (
                <option key={operation.id} value={operation.id}>
                  {operation.label}
                </option>
              ))}
            </select>
            <small>{selectedOperation?.description}</small>
          </label>
        )}

        <OperationOptions
          toolId={tool.id}
          operationId={selectedOperationId}
          values={operationOptions}
          onChange={(key, value) => {
            setOperationOptions((currentValues) => ({ ...currentValues, [key]: value }));
            resetFeedback();
          }}
        />

        {tool.id === "yt-dlp" && (
          <label className="source-url">
            <span>Media URL</span>
            <input
              aria-label="Media URL"
              type="url"
              placeholder="https://..."
              value={sourceUrl}
              onChange={(event) => {
                setSourceUrl(event.target.value);
                resetFeedback();
              }}
            />
          </label>
        )}

        {tool.id !== "deno" && tool.id !== "yt-dlp" && <FileField />}

        {requiresOutput(tool.id, selectedOperationId) && (
          <div className="tool-option">
            <span>
              <strong>Destination</strong>
              <small>{outputPath || "Choose the destination when you run it. The extension decides the format."}</small>
            </span>
            <button
              className="icon-button"
              type="button"
              aria-label="Choose destination"
              onClick={() => void chooseNativeOutput().catch(handleFormError)}
            >
              <FolderOpen size={18} />
            </button>
          </div>
        )}

        {resultMessage && (
          <pre
            className={`run-message${resultIsError ? " run-message--error" : ""}`}
            role={resultIsError ? "alert" : "status"}
          >
            {resultMessage}
          </pre>
        )}
      </div>
      <div className="tool-panel__footer">
        <div className="tool-panel__status" aria-live="polite">
          {isRunning ? (
            <>
              <div className="tool-panel__status-line">
                <strong>{currentJob.message}</strong>
                <span>{currentJob.progress == null ? "…" : `${Math.round(currentJob.progress * 100)}%`}</span>
              </div>
              <div
                className={`progress-track progress-track--operation${currentJob.progress == null ? " progress-track--indeterminate" : ""}`}
                role="progressbar"
                aria-label="Operation progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={currentJob.progress == null ? undefined : Math.round(currentJob.progress * 100)}
              >
                <span
                  style={{ inlineSize: currentJob.progress == null ? undefined : `${currentJob.progress * 100}%` }}
                />
              </div>
              <p className="tool-panel__hint">You can close this tool: the job keeps running in the Queue.</p>
            </>
          ) : (
            <p>
              {currentJob?.status === "succeeded" ? (
                <>
                  <Check size={14} aria-hidden="true" /> Done, and recorded in the history.
                </>
              ) : currentJob?.status === "failed" ? (
                <>
                  <AlertTriangle size={14} aria-hidden="true" /> The job failed. Your original file was left untouched.
                </>
              ) : (
                idleHint(tool.id)
              )}
            </p>
          )}
        </div>
        <button
          className="button button--primary"
          type="button"
          disabled={!canRun || isRunning}
          onClick={() => void startOperation()}
        >
          <Play size={16} aria-hidden="true" /> {isRunning ? "Running" : "Run"}
        </button>
      </div>
    </aside>
  );

  function FileField() {
    const label = selectedFileNames.length
      ? selectedFileNames.join(", ")
      : folderTools.includes(tool.id)
        ? "Choose the project folder"
        : tool.id === "difftastic"
          ? "Choose both files"
          : "Choose files";
    const hint = selectedFileNames.length
      ? `${selectedFileNames.length} file${selectedFileNames.length === 1 ? "" : "s"} selected`
      : "or click to choose";

    // The native host must receive real Windows paths, so it opens a system dialog.
    // A file input would only expose a bare file name to the WebView.
    if (isNativeHost()) {
      return (
        <button
          type="button"
          className="file-drop file-drop--compact"
          onClick={() => void chooseNativeFiles().catch(handleFormError)}
        >
          <FilePlus2 size={24} aria-hidden="true" />
          <strong>{label}</strong>
          <span>{hint}</span>
        </button>
      );
    }

    return (
      <label className="file-drop file-drop--compact">
        <input
          type="file"
          multiple
          aria-label="Choose files"
          onChange={(event) => {
            setSelectedFiles(Array.from(event.target.files ?? []).map((file) => ({ name: file.name, path: file.name })));
            resetFeedback();
          }}
        />
        <FilePlus2 size={24} aria-hidden="true" />
        <strong>{label}</strong>
        <span>{hint}</span>
      </label>
    );
  }

  function resetFeedback() {
    setFormError("");
    setCurrentJobId(null);
  }

  async function chooseNativeFiles() {
    const directory = folderTools.includes(tool.id);
    const multiple =
      multiInputOperations.includes(selectedOperationId) ||
      (tool.id === "7zip" && selectedOperationId === "compress");
    const selected = await open({ multiple: !directory && multiple, directory });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    setSelectedFiles(paths.map((path) => ({ path, name: fileNameOnly(path) })));
    resetFeedback();
  }

  async function chooseNativeOutput() {
    if (!isNativeHost()) return;
    if (tool.id === "7zip" && selectedOperationId === "extract") {
      const selected = await open({ directory: true, multiple: false });
      if (typeof selected === "string") setOutputPath(selected);
      return;
    }
    const selected = await save({
      defaultPath: suggestedOutputName(selectedFiles[0]?.path, selectedOperationId, tool.id),
    });
    if (selected) setOutputPath(selected);
  }

  async function startOperation() {
    if (!canRun || isRunning) return;
    resetFeedback();
    try {
      const resolvedOutput =
        outputPath ||
        (isNativeHost() && requiresOutput(tool.id, selectedOperationId) ? await pickOutputForOperation() : "");
      const jobId = onRun?.({
        request: {
          toolId: tool.id,
          operationId: selectedOperationId,
          inputPaths: selectedFiles.map((file) => file.path),
          outputPath: resolvedOutput || null,
          options: operationOptions,
          sourceUrl: sourceUrl.trim() || null,
        },
        toolName: tool.title,
        operationLabel: selectedOperation?.label ?? "Run operation",
        sourceLabel: sourceUrl.trim() || selectedFileNames.join(", ") || tool.integrationName,
      });
      if (jobId) setCurrentJobId(jobId);
    } catch (error) {
      handleFormError(error);
    }
  }

  async function pickOutputForOperation() {
    if (tool.id === "7zip" && selectedOperationId === "extract") {
      const selected = await open({ directory: true, multiple: false });
      if (typeof selected !== "string") throw new Error("Choose a destination folder to continue.");
      setOutputPath(selected);
      return selected;
    }
    const selected = await save({
      defaultPath: suggestedOutputName(selectedFiles[0]?.path, selectedOperationId, tool.id),
    });
    if (!selected) throw new Error("Choose an output file to continue.");
    setOutputPath(selected);
    return selected;
  }

  function handleFormError(error: unknown) {
    setFormError(
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "The operation could not be started.",
    );
  }
}

function jobResultText(job: ToolJob): string {
  return job.outputPath ? `${job.message}\nOutput: ${job.outputPath}` : job.message;
}

function idleHint(toolId: string): string {
  if (toolId === "yt-dlp") return "Add a URL or a file to enable the run.";
  if (toolId === "deno") return "Reports the version installed on this Windows.";
  if (toolId === "difftastic") return "Choose two files to compare.";
  if (folderTools.includes(toolId)) return "Choose a folder to enable the run.";
  return "Add files to enable the run.";
}

function OperationOptions({
  toolId,
  operationId,
  values,
  onChange,
}: {
  toolId: string;
  operationId: string;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const fields = operationFields(toolId, operationId);
  if (fields.length === 0) return null;
  return (
    <div className="operation-options" aria-label="Operation options">
      {fields.map((field) => (
        <label key={field.key}>
          <span>{field.label}</span>
          <input
            aria-label={field.label}
            type={field.type}
            placeholder={field.placeholder}
            value={values[field.key] ?? field.defaultValue ?? ""}
            onChange={(event) => onChange(field.key, event.target.value)}
          />
        </label>
      ))}
    </div>
  );
}

function operationFields(
  toolId: string,
  operationId: string,
): Array<{
  key: string;
  label: string;
  type: "text" | "number" | "password";
  placeholder?: string;
  defaultValue?: string;
}> {
  if (toolId === "ffmpeg" && operationId === "trim")
    return [
      { key: "start", label: "Start (seconds)", type: "number", defaultValue: "0" },
      { key: "end", label: "End (seconds)", type: "number", defaultValue: "10" },
    ];
  if (toolId === "ffmpeg" && operationId === "compress")
    return [{ key: "crf", label: "Quality (CRF)", type: "number", defaultValue: "23" }];
  if (toolId === "qpdf" && operationId === "split")
    return [{ key: "pages", label: "Pages", type: "text", defaultValue: "1-z" }];
  if (toolId === "qpdf" && operationId === "rotate")
    return [{ key: "degrees", label: "Degrees", type: "number", defaultValue: "90" }];
  if (toolId === "qpdf" && operationId === "protect")
    return [{ key: "password", label: "PDF password", type: "password", placeholder: "Type a password" }];
  if ((toolId === "jq" || toolId === "yq") && operationId === "query")
    return [{ key: "query", label: "Expression", type: "text", defaultValue: "." }];
  if (toolId === "ripgrep" && operationId === "search")
    return [{ key: "query", label: "Text or regex", type: "text", placeholder: "e.g. TODO" }];
  if (toolId === "fd" && operationId === "find")
    return [{ key: "query", label: "Name or extension", type: "text", placeholder: "e.g. .ts" }];
  if (toolId === "libvips" && (operationId === "resize" || operationId === "upscale"))
    return [{ key: "scale", label: "Scale", type: "number", defaultValue: operationId === "upscale" ? "2" : "1" }];
  if (toolId === "libvips" && operationId === "crop")
    return [
      { key: "left", label: "Left", type: "number", defaultValue: "0" },
      { key: "top", label: "Top", type: "number", defaultValue: "0" },
      { key: "width", label: "Width", type: "number", defaultValue: "100" },
      { key: "height", label: "Height", type: "number", defaultValue: "100" },
    ];
  if (toolId === "libvips" && operationId === "compress")
    return [{ key: "quality", label: "Quality", type: "number", defaultValue: "80" }];
  if (toolId === "poppler" && operationId === "rasterize")
    return [
      { key: "page", label: "Page", type: "number", defaultValue: "1" },
      { key: "dpi", label: "Resolution (DPI)", type: "number", defaultValue: "150" },
    ];
  if (toolId === "oxipng" && operationId === "optimize")
    return [{ key: "level", label: "Level (0–6 or max)", type: "text", defaultValue: "2" }];
  if (toolId === "exiftool" && operationId === "set-title")
    return [{ key: "title", label: "Title", type: "text", placeholder: "e.g. Signed contract" }];
  if (toolId === "hexyl" && operationId === "preview")
    return [{ key: "length", label: "Bytes", type: "number", defaultValue: "256" }];
  if (toolId === "dust" && operationId === "usage")
    return [
      { key: "depth", label: "Depth", type: "number", defaultValue: "2" },
      { key: "lines", label: "Rows", type: "number", defaultValue: "20" },
    ];
  return [];
}

function fileNameOnly(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

const readOnlyTools = [
  "ffprobe", "deno", "jq", "yq", "ripgrep", "fd",
  "miller", "hexyl", "tokei", "difftastic", "dust",
];
/** Tools whose input is a folder, not a file. */
const folderTools = ["fd", "ripgrep", "tokei", "dust"];
/** Operations that need more than one input. */
const multiInputOperations = ["merge", "compare"];
const readOnlyOperations = ["inspect", "inspect-url"];

function requiresOutput(toolId: string, operationId: string): boolean {
  return !readOnlyTools.includes(toolId) && !readOnlyOperations.includes(operationId);
}

/** The destination extension decides the format, so each operation names its own. */
function outputExtension(toolId: string, operationId: string, originalExtension: string): string {
  const byOperation: Record<string, string> = {
    "7zip/compress": ".zip",
    "pandoc/convert": ".html",
    "ffmpeg/extract-audio": ".mp3",
    "ffmpeg/convert": ".mp4",
    "ffmpeg/compress": ".mp4",
    "ffmpeg/trim": ".mp4",
    "libvips/compress": ".jpg",
    "poppler/extract-text": ".txt",
    "poppler/rasterize": ".png",
    "oxipng/optimize": ".png",
    "mkvtoolnix/remux": ".mkv",
    "imagemagick/convert": ".png",
  };
  return byOperation[`${toolId}/${operationId}`] ?? (toolId === "qpdf" ? ".pdf" : originalExtension);
}

export function suggestedOutputName(inputPath: string | undefined, operationId: string, toolId: string): string {
  if (toolId === "yt-dlp") return operationId === "download-audio" ? "audio.mp3" : "video.mp4";
  const path = inputPath ?? "resultado";
  const filename = fileNameOnly(path);
  const stem = filename.replace(/\.[^.]+$/, "");
  const folder = path.slice(0, path.length - filename.length);
  const originalExtension = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : ".out";
  return `${folder}${stem}-${operationId}${outputExtension(toolId, operationId, originalExtension)}`;
}
