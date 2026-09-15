import { useEffect, useState } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { FileQuestion } from "lucide-react";
import { isNativeHost } from "../hooks/useOperationRunner";

const imageExtensions = ["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "ico", "svg"];
/** What WebView2 can actually decode. MKV, AVI and MOV usually cannot. */
const videoExtensions = ["mp4", "webm", "ogv", "m4v"];
const audioExtensions = ["mp3", "wav", "ogg", "oga", "m4a", "flac", "opus"];

type Kind = "image" | "video" | "audio" | "none";

function kindOf(path: string): Kind {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  if (imageExtensions.includes(extension)) return "image";
  if (videoExtensions.includes(extension)) return "video";
  if (audioExtensions.includes(extension)) return "audio";
  return "none";
}

/**
 * Shows the file an operation is about to act on.
 *
 * The WebView cannot read the disk on its own: the host grants it this one
 * path first, so the window never holds access to anything the user did not
 * choose. Anything the WebView cannot decode — Matroska, raw camera files —
 * says so rather than showing a broken frame.
 */
export function FilePreview({ path }: { path: string | undefined }) {
  const [source, setSource] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const kind = path ? kindOf(path) : "none";

  useEffect(() => {
    setFailed(false);
    setSource(null);
    if (!path || kind === "none" || !isNativeHost()) return;

    let active = true;
    void invoke("allow_preview", { path })
      .then(() => {
        if (active) setSource(convertFileSrc(path));
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [path, kind]);

  if (!path || kind === "none") return null;

  const name = path.split(/[\\/]/).pop() ?? path;

  return (
    <figure className="file-preview">
      <div className="file-preview__stage">
        {failed || !source ? (
          <div className="file-preview__fallback">
            <FileQuestion size={22} aria-hidden="true" />
            <span>{failed ? "This format cannot be shown here" : "Opening preview…"}</span>
          </div>
        ) : kind === "image" ? (
          <img src={source} alt={`Preview of ${name}`} onError={() => setFailed(true)} />
        ) : kind === "video" ? (
          <video src={source} controls muted preload="metadata" onError={() => setFailed(true)} />
        ) : (
          <audio src={source} controls preload="metadata" onError={() => setFailed(true)} />
        )}
      </div>
      <figcaption>{name}</figcaption>
    </figure>
  );
}
