import { useEffect, useRef, useState } from "react";
import { Check, FilePlus2, FolderOpen, Play, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { CatalogTool } from "../catalog/catalog";

type ToolPanelProps = {
  tool: CatalogTool;
  initialPath?: string | null;
  onClose: () => void;
  onQueue?: (input: { operationLabel: string; sourceLabel: string; options: Record<string, string>; completed: boolean }) => void;
};

type SelectedFile = { name: string; path: string };
type RunState = "idle" | "running" | "error";

type OperationProgressEvent = {
  toolId: string;
  operationId: string;
  phase: "starting" | "downloading" | "completed" | "error";
  progress: number | null;
  message: string;
};

export function ToolPanel({ tool, initialPath, onClose, onQueue }: ToolPanelProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>(() => initialPath && !["deno", "yt-dlp", "fd", "ripgrep"].includes(tool.id) ? [{ path: initialPath, name: fileNameOnly(initialPath) }] : []);
  const [selectedOperationId, setSelectedOperationId] = useState(tool.operations[0]?.id ?? "");
  const [sourceUrl, setSourceUrl] = useState("");
  const [operationOptions, setOperationOptions] = useState<Record<string, string>>({});
  const [outputPath, setOutputPath] = useState("");
  const [wasQueued, setWasQueued] = useState(false);
  const [runState, setRunState] = useState<RunState>("idle");
  const [runMessage, setRunMessage] = useState("");
  const [operationProgress, setOperationProgress] = useState<OperationProgressEvent | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const selectedOperation = tool.operations.find((operation) => operation.id === selectedOperationId);
  const selectedFileNames = selectedFiles.map((file) => file.name);
  const canRun = selectedFiles.length > 0 || (tool.id === "yt-dlp" && sourceUrl.trim().length > 0) || (tool.id === "deno" && selectedOperationId === "runtime");

  useEffect(() => { closeButtonRef.current?.focus(); }, []);

  useEffect(() => {
    if (!isNativeHost()) return;
    let active = true;
    let unlisten: (() => void) | undefined;
    void listen<OperationProgressEvent>("operation-progress", (event) => {
      const progress = event.payload;
      if (!active || progress.toolId !== tool.id || progress.operationId !== selectedOperationId) return;
      setOperationProgress(progress);
      if (progress.phase === "downloading") setRunMessage(progress.message);
      if (progress.phase === "error") setRunMessage(progress.message);
    }).then((cleanup) => {
      if (active) unlisten = cleanup;
      else cleanup();
    }).catch(() => {
      // The browser preview intentionally has no native event bridge.
    });
    return () => { active = false; unlisten?.(); };
  }, [selectedOperationId, tool.id]);

  return (
    <aside className="tool-panel" role="dialog" aria-modal="false" aria-labelledby="tool-panel-title">
      <div className="tool-panel__topbar">
        <span>{tool.integrationName}</span>
        <button ref={closeButtonRef} className="icon-button" type="button" onClick={onClose} aria-label="Fechar ferramenta"><X size={18} /></button>
      </div>
      <div className="tool-panel__body">
        <h2 id="tool-panel-title">{tool.title}</h2>
        <p>{tool.description}</p>

        {tool.operations.length > 0 && (
          <label className="operation-select">
            <span>Operação</span>
            <select disabled={runState === "running"} aria-label="Operação" value={selectedOperationId} onChange={(event) => {
              setSelectedOperationId(event.target.value);
              setOperationOptions({});
              setOutputPath("");
              setRunMessage("");
              setOperationProgress(null);
              setWasQueued(false);
            }}>
              {tool.operations.map((operation) => <option key={operation.id} value={operation.id}>{operation.label}</option>)}
            </select>
            <small>{selectedOperation?.description}</small>
          </label>
        )}

        <OperationOptions toolId={tool.id} operationId={selectedOperationId} values={operationOptions} onChange={(key, value) => {
          setOperationOptions((currentValues) => ({ ...currentValues, [key]: value }));
          setWasQueued(false);
        }} />

        {tool.id === "yt-dlp" && (
          <label className="source-url">
            <span>URL de mídia</span>
            <input aria-label="URL de mídia" type="url" placeholder="https://..." value={sourceUrl} onChange={(event) => { setSourceUrl(event.target.value); setWasQueued(false); }} />
          </label>
        )}

        {tool.id !== "deno" && tool.id !== "yt-dlp" && <label className="file-drop file-drop--compact" onClick={(event) => {
          if (!isNativeHost()) return;
          event.preventDefault();
          if (runState === "running") return;
          void chooseNativeFiles().catch(handleRunError);
        }}>
          <input type="file" multiple aria-label="Escolher arquivos" onChange={(event) => {
            setSelectedFiles(Array.from(event.target.files ?? []).map((file) => ({ name: file.name, path: filePath(file) })));
            setWasQueued(false);
            setRunMessage("");
          }} />
          <FilePlus2 size={24} />
          <strong>{selectedFileNames.length ? selectedFileNames.join(", ") : tool.id === "fd" || tool.id === "ripgrep" ? "Escolher pasta do projeto" : "Escolher arquivos"}</strong>
          <span>{selectedFileNames.length ? `${selectedFileNames.length} arquivo(s) selecionado(s)` : "ou clique para escolher"}</span>
        </label>}

        {requiresOutput(tool.id, selectedOperationId) && <div className="tool-option">
          <span><strong>Destino</strong><small>{outputPath || "Escolha o destino ao executar. A extensão define o formato."}</small></span>
          <button className="icon-button" type="button" disabled={runState === "running"} aria-label="Escolher destino" onClick={() => void chooseNativeOutput().catch(handleRunError)}><FolderOpen size={18} /></button>
        </div>}
        {runMessage && <pre className={`run-message${runState === "error" ? " run-message--error" : ""}`} role={runState === "error" ? "alert" : undefined}>{runMessage}</pre>}
      </div>
      <div className="tool-panel__footer">
        <div className="tool-panel__status" aria-live="polite">
          {runState === "running" && <>
            <div className="tool-panel__status-line">
              <strong>{operationProgress?.message || "Preparando operação…"}</strong>
              <span>{operationProgress?.progress == null ? "…" : `${Math.round(operationProgress.progress * 100)}%`}</span>
            </div>
            <div className="progress-track progress-track--operation" role="progressbar" aria-label="Progresso da operação" aria-valuemin={0} aria-valuemax={100} aria-valuenow={operationProgress?.progress == null ? undefined : Math.round(operationProgress.progress * 100)}>
              <span style={{ inlineSize: operationProgress?.progress == null ? undefined : `${operationProgress.progress * 100}%` }} />
            </div>
          </>}
          {runState !== "running" && <p>{wasQueued ? <><Check size={14} /> Tarefa concluída e registrada no histórico.</> : tool.id === "yt-dlp" ? "Adicione uma URL ou arquivo para habilitar a execução." : tool.id === "deno" ? "Consulte a versão instalada no host Windows." : "Adicione arquivos para habilitar a execução."}</p>}
        </div>
        <button className="button button--primary" type="button" disabled={!canRun || runState === "running"} onClick={() => void executeOperation()}><Play size={16} /> Executar</button>
      </div>
    </aside>
  );

  async function chooseNativeFiles() {
    const directory = tool.id === "fd" || tool.id === "ripgrep";
    const multiple = selectedOperationId === "merge" || (tool.id === "7zip" && selectedOperationId === "compress");
    const selected = await open({ multiple: !directory && multiple, directory });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    setSelectedFiles(paths.map((path) => ({ path, name: fileNameOnly(path) })));
    setWasQueued(false);
    setRunMessage("");
  }

  async function chooseNativeOutput() {
    if (!isNativeHost()) return;
    if (tool.id === "7zip" && selectedOperationId === "extract") {
      const selected = await open({ directory: true, multiple: false });
      if (typeof selected === "string") setOutputPath(selected);
      return;
    }
    const selected = await save({ defaultPath: suggestedOutputName(selectedFiles[0]?.path, selectedOperationId, tool.id) });
    if (selected) setOutputPath(selected);
  }

  async function executeOperation() {
    if (!canRun) return;
    setWasQueued(false);
    setRunState("running");
    setRunMessage("");
    setOperationProgress({ toolId: tool.id, operationId: selectedOperationId, phase: "starting", progress: 0, message: "Preparando operação…" });
    try {
      const resolvedOutput = outputPath || (isNativeHost() && requiresOutput(tool.id, selectedOperationId) ? await pickOutputForOperation() : "");
      if (isNativeHost()) {
        const result = await invoke<{ stdout: string; outputPath?: string | null; message?: string }>("execute_operation", {
          request: {
            toolId: tool.id,
            operationId: selectedOperationId,
            inputPaths: selectedFiles.map((file) => file.path),
            outputPath: resolvedOutput || null,
            options: operationOptions,
            sourceUrl: sourceUrl.trim() || null,
          },
        });
        const outputNotice = result.outputPath ? `\nSaída: ${result.outputPath}` : "";
        setRunMessage(`${result.stdout.trim() || result.message || "Operação concluída no host Windows."}${outputNotice}`);
      } else {
        throw new Error("Abra o app Workbench para executar operações no Windows. Esta página é apenas a interface de pré-visualização.");
      }
      const historyOptions = Object.fromEntries(Object.entries(operationOptions).filter(([key]) => key !== "password"));
      onQueue?.({ operationLabel: selectedOperation?.label ?? "Executar operação", sourceLabel: sourceUrl.trim() || selectedFileNames.join(", ") || tool.integrationName, options: historyOptions, completed: true });
      setWasQueued(true);
      setRunState("idle");
    } catch (error) {
      handleRunError(error);
    }
  }

  async function pickOutputForOperation() {
    if (tool.id === "7zip" && selectedOperationId === "extract") {
      const selected = await open({ directory: true, multiple: false });
      if (typeof selected !== "string") throw new Error("Escolha uma pasta de destino para continuar.");
      setOutputPath(selected);
      return selected;
    }
    const selected = await save({ defaultPath: suggestedOutputName(selectedFiles[0]?.path, selectedOperationId, tool.id) });
    if (!selected) throw new Error("Escolha um arquivo de saída para continuar.");
    setOutputPath(selected);
    return selected;
  }

  function handleRunError(error: unknown) {
    setRunState("error");
    setRunMessage(error instanceof Error ? error.message : typeof error === "string" ? error : "Não foi possível executar a operação.");
  }
}

function OperationOptions({ toolId, operationId, values, onChange }: { toolId: string; operationId: string; values: Record<string, string>; onChange: (key: string, value: string) => void }) {
  const fields = operationFields(toolId, operationId);
  if (fields.length === 0) return null;
  return <div className="operation-options" aria-label="Opções da operação">{fields.map((field) => <label key={field.key}><span>{field.label}</span><input aria-label={field.label} type={field.type} placeholder={field.placeholder} value={values[field.key] ?? field.defaultValue ?? ""} onChange={(event) => onChange(field.key, event.target.value)} /></label>)}</div>;
}

function operationFields(toolId: string, operationId: string): Array<{ key: string; label: string; type: "text" | "number" | "password"; placeholder?: string; defaultValue?: string }> {
  if (toolId === "ffmpeg" && operationId === "trim") return [{ key: "start", label: "Início (segundos)", type: "number", defaultValue: "0" }, { key: "end", label: "Fim (segundos)", type: "number", defaultValue: "10" }];
  if (toolId === "ffmpeg" && operationId === "compress") return [{ key: "crf", label: "Qualidade (CRF)", type: "number", defaultValue: "23" }];
  if (toolId === "qpdf" && operationId === "split") return [{ key: "pages", label: "Páginas", type: "text", defaultValue: "1-z" }];
  if (toolId === "qpdf" && operationId === "rotate") return [{ key: "degrees", label: "Graus", type: "number", defaultValue: "90" }];
  if (toolId === "qpdf" && operationId === "protect") return [{ key: "password", label: "Senha do PDF", type: "password", placeholder: "Digite uma senha" }];
  if ((toolId === "jq" || toolId === "yq") && operationId === "query") return [{ key: "query", label: "Expressão", type: "text", defaultValue: "." }];
  if (toolId === "ripgrep" && operationId === "search") return [{ key: "query", label: "Texto ou regex", type: "text", placeholder: "ex.: TODO" }];
  if (toolId === "fd" && operationId === "find") return [{ key: "query", label: "Nome ou extensão", type: "text", placeholder: "ex.: .ts" }];
  if (toolId === "libvips" && (operationId === "resize" || operationId === "upscale")) return [{ key: "scale", label: "Escala", type: "number", defaultValue: operationId === "upscale" ? "2" : "1" }];
  if (toolId === "libvips" && operationId === "crop") return [{ key: "left", label: "Esquerda", type: "number", defaultValue: "0" }, { key: "top", label: "Topo", type: "number", defaultValue: "0" }, { key: "width", label: "Largura", type: "number", defaultValue: "100" }, { key: "height", label: "Altura", type: "number", defaultValue: "100" }];
  if (toolId === "libvips" && operationId === "compress") return [{ key: "quality", label: "Qualidade", type: "number", defaultValue: "80" }];
  return [];
}

type FileWithPath = File & { path?: string };
function filePath(file: File): string { return (file as FileWithPath).path ?? file.name; }
function fileNameOnly(path: string): string { return path.split(/[\\/]/).pop() ?? path; }
function isNativeHost(): boolean { return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window; }
function requiresOutput(toolId: string, operationId: string): boolean {
  return !["ffprobe", "deno", "jq", "yq", "ripgrep", "fd"].includes(toolId) && operationId !== "inspect-url";
}

export function suggestedOutputName(inputPath: string | undefined, operationId: string, toolId: string): string {
  if (toolId === "yt-dlp") return operationId === "download-audio" ? "audio.mp3" : "video.mp4";
  const path = inputPath ?? "resultado";
  const filename = fileNameOnly(path);
  const stem = filename.replace(/\.[^.]+$/, "");
  const folder = path.slice(0, path.length - filename.length);
  const originalExtension = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : ".out";
  const extension = toolId === "7zip" ? ".zip" : toolId === "pandoc" ? ".html" : toolId === "ffmpeg" ? operationId === "extract-audio" ? ".mp3" : ".mp4" : toolId === "qpdf" ? ".pdf" : toolId === "libvips" && operationId === "compress" ? ".jpg" : originalExtension;
  return `${folder}${stem}-${operationId}${extension}`;
}
