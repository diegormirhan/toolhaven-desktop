import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, FilePlus2, Mic, Music, Speaker } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import type { CatalogTool } from "../catalog/catalog";
import { isNativeHost } from "../hooks/useOperationRunner";
import { acceptsFile } from "../catalog/formats";
import { PanelShell } from "./PanelShell";
import { Select } from "./Select";
import { NumberField } from "./NumberField";

type AudioSource = { id: string; label: string; kind: "microphone" | "playback"; isDefault: boolean };

type Recognition = {
  matched: boolean;
  title: string;
  artist: string;
  album: string;
  released: string;
  label: string;
  genre: string;
  url: string;
  coverUrl: string;
  message: string;
};

/**
 * Names the music that is playing.
 *
 * Three ways in, and the panel is explicit about which one is running because
 * they carry different expectations: listening to the room, listening to what
 * this machine is playing, and reading a file that is already here.
 */
export function MusicPanel({
  tool,
  initialPath,
  droppedPaths,
  leaving = false,
  onClose,
  onExited,
  onDirtyChange,
}: {
  tool: CatalogTool;
  initialPath?: string | null;
  droppedPaths?: string[];
  leaving?: boolean;
  onClose: () => void;
  onExited?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [sources, setSources] = useState<AudioSource[]>([]);
  const [source, setSource] = useState<"device" | "file">("device");
  const [deviceId, setDeviceId] = useState("");
  const [path, setPath] = useState(initialPath ?? "");
  const [seconds, setSeconds] = useState("12");
  const [startSeconds, setStartSeconds] = useState("0");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Recognition | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => closeButtonRef.current?.focus(), []);

  // The answer appears below the fold on a short window, and a panel that has
  // finished without appearing to change reads as one that did nothing.
  useEffect(() => {
    if (result || error) // Optional call: jsdom has the element but not the method.
      resultRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [result, error]);

  useEffect(() => {
    if (!isNativeHost()) return;
    void invoke<AudioSource[]>("list_audio_sources")
      .then((found) => {
        setSources(found);
        // What is playing on the machine is the case this was asked for, so
        // that is what the picker opens on.
        const preferred =
          found.find((candidate) => candidate.kind === "playback" && candidate.isDefault) ?? found[0];
        if (preferred) setDeviceId(preferred.id);
      })
      .catch((reason: unknown) => setError(String(reason)));
  }, []);

  useEffect(() => {
    onDirtyChange?.(Boolean(result) || busy);
  }, [result, busy, onDirtyChange]);

  useEffect(() => {
    const dropped = droppedPaths?.[0];
    if (!dropped) return;
    const verdict = acceptsFile("ffmpeg", dropped);
    if (!verdict.ok) {
      setError(verdict.reason);
      return;
    }
    setError("");
    setPath(dropped);
    setSource("file");
  }, [droppedPaths]);

  // A countdown, because a panel that sits still for twelve seconds reads as
  // frozen rather than listening.
  useEffect(() => {
    if (!busy || source !== "device") return;
    setRemaining(Number(seconds));
    const timer = setInterval(() => setRemaining((left) => Math.max(0, left - 1)), 1000);
    return () => clearInterval(timer);
  }, [busy, source, seconds]);

  const canRun = source === "file" ? path.length > 0 : deviceId.length > 0;

  function recognise() {
    if (!canRun || busy) return;
    if (!isNativeHost()) {
      setError("Open the ToolHaven app to listen. This page is the interface preview only.");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    void invoke<Recognition>("recognize_music", {
      request: {
        source,
        path: source === "file" ? path : null,
        deviceId: source === "device" ? deviceId : null,
        seconds: Number(seconds) || 12,
        startSeconds: source === "file" ? Number(startSeconds) || 0 : 0,
      },
    })
      .then(setResult)
      .catch((reason: unknown) => setError(String(reason)))
      .finally(() => setBusy(false));
  }

  const listening = sources.filter((candidate) => candidate.kind === "playback");
  const microphones = sources.filter((candidate) => candidate.kind === "microphone");

  return (
    <PanelShell
      ref={closeButtonRef}
      title={tool.integrationName}
      leaving={leaving}
      onClose={onClose}
      onExited={onExited}
    >
      <section className="tool-panel__controls">
        <h2 id="tool-panel-title">{tool.title}</h2>
        <p>{tool.description}</p>

        <p className="notice notice--outbound">
          <ExternalLink size={14} aria-hidden="true" />
          <span>
            The clip is fingerprinted on this machine and deleted straight after. Only the
            fingerprint is sent — never the recording itself.
          </span>
        </p>

        <label className="operation-select">
          <span>Listen to</span>
          <Select
            label="Listen to"
            value={source}
            choices={[
              { value: "device", label: "A microphone or the speakers" },
              { value: "file", label: "A file on this machine" },
            ]}
            onChange={(next) => {
              setSource(next as "device" | "file");
              setError("");
              setResult(null);
            }}
          />
        </label>

        {source === "device" && (
          <label className="operation-select">
            <span>Sound source</span>
            <Select
              label="Sound source"
              value={deviceId}
              choices={[
                ...listening.map((candidate) => ({
                  value: candidate.id,
                  label: `${candidate.label} — what is playing`,
                })),
                ...microphones.map((candidate) => ({
                  value: candidate.id,
                  label: `${candidate.label} — the room`,
                })),
              ]}
              onChange={setDeviceId}
            />
            <small>
              Picking a speaker records what this machine is playing, without a cable or a
              virtual device. Picking a microphone records the room.
            </small>
          </label>
        )}

        {source === "file" && (
          <>
            <div className="tool-option">
              <span>
                <strong>File</strong>
                <small>{path ? fileNameOnly(path) : "No file chosen."}</small>
              </span>
              <button
                className="icon-button"
                type="button"
                aria-label="Choose a file"
                onClick={() =>
                  void open({ multiple: false })
                    .then((selected) => {
                      if (typeof selected !== "string") return;
                      const verdict = acceptsFile("ffmpeg", selected);
                      if (!verdict.ok) {
                        setError(verdict.reason);
                        return;
                      }
                      setError("");
                      setResult(null);
                      setPath(selected);
                    })
                    .catch((reason: unknown) => setError(String(reason)))
                }
              >
                <FilePlus2 size={18} />
              </button>
            </div>
            <label className="tool-option">
              <span>
                <strong>Start at (seconds)</strong>
                <small>Skip a quiet intro. The middle of a track matches more reliably.</small>
              </span>
              <NumberField label="Start at (seconds)" value={startSeconds} min={0} step={10} onChange={setStartSeconds} />
            </label>
          </>
        )}

        <label className="tool-option">
          <span>
            <strong>Clip length (seconds)</strong>
            <small>Twelve is usually plenty. Longer helps a noisy room.</small>
          </span>
          <NumberField label="Clip length (seconds)" value={seconds} min={4} max={30} onChange={setSeconds} />
        </label>

        {error && (
          <p className="panel-result panel-result--error" role="status">
            <AlertTriangle size={15} aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}

        <div ref={resultRef}>{result && <RecognitionCard result={result} />}</div>

        <div className="panel-actions">
          <button className="button button--primary" type="button" disabled={!canRun || busy} onClick={recognise}>
            {source === "device" ? <Mic size={16} aria-hidden="true" /> : <Music size={16} aria-hidden="true" />}
            {busy
              ? source === "device"
                ? `Listening… ${remaining}s`
                : "Listening…"
              : "Identify"}
          </button>
        </div>
      </section>
    </PanelShell>
  );
}

function RecognitionCard({ result }: { result: Recognition }) {
  if (!result.matched) {
    return (
      <p className="panel-result" role="status">
        <Speaker size={15} aria-hidden="true" />
        <span>{result.message}</span>
      </p>
    );
  }
  const rows = [
    ["Album", result.album],
    ["Released", result.released],
    ["Genre", result.genre],
    ["Label", result.label],
  ].filter(([, value]) => value);

  return (
    <article className="recognition" aria-label="What was recognised">
      {result.coverUrl && (
        <img className="recognition__cover" src={result.coverUrl} alt={`Cover art for ${result.title}`} />
      )}
      <div className="recognition__detail">
        <h3>{result.title || "Untitled"}</h3>
        {result.artist && <p className="recognition__artist">{result.artist}</p>}
        {rows.length > 0 && (
          <dl className="recognition__rows">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {result.url && (
          <a className="recognition__link" href={result.url} target="_blank" rel="noreferrer noopener">
            <ExternalLink size={14} aria-hidden="true" />
            Open the track page
          </a>
        )}
      </div>
    </article>
  );
}

function fileNameOnly(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}
