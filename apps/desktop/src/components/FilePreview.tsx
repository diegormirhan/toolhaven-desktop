import { useEffect, useRef, useState } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { FileQuestion } from "lucide-react";
import { isNativeHost } from "../hooks/useOperationRunner";
import { CropOverlay, type CropRect } from "./CropOverlay";

const imageExtensions = ["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "ico", "svg"];
/** What WebView2 can actually decode. MKV, AVI and MOV usually cannot. */
const videoExtensions = ["mp4", "webm", "ogv", "m4v"];
const audioExtensions = ["mp3", "wav", "ogg", "oga", "m4a", "flac", "opus"];

export type PreviewKind = "image" | "video" | "audio" | "none";

export function previewKind(path: string | undefined): PreviewKind {
  if (!path) return "none";
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  if (imageExtensions.includes(extension)) return "image";
  if (videoExtensions.includes(extension)) return "video";
  if (audioExtensions.includes(extension)) return "audio";
  return "none";
}

type FilePreviewProps = {
  path: string | undefined;
  /** Source dimensions, once they are known. */
  onNatural?: (size: { width: number; height: number }) => void;
  /** Present only while an operation crops; drawing it implies editing it. */
  crop?: CropRect | null;
  onCropChange?: (rect: CropRect) => void;
  /** Where a video should be parked, so trimming can show its own edges. */
  seekTo?: number;
  onDuration?: (seconds: number) => void;
};

/**
 * Shows the file an operation is about to act on.
 *
 * The WebView cannot read the disk on its own: the host grants it this one
 * path first, so the window never holds access to anything the user did not
 * choose. Anything the WebView cannot decode — Matroska, raw camera files —
 * says so rather than showing a broken frame.
 */
export function FilePreview({
  path,
  onNatural,
  crop,
  onCropChange,
  seekTo,
  onDuration,
}: FilePreviewProps) {
  const [source, setSource] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [media, setMedia] = useState<HTMLImageElement | HTMLVideoElement | null>(null);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const kind = previewKind(path);

  useEffect(() => {
    setFailed(false);
    setSource(null);
    setMedia(null);
    setNatural({ width: 0, height: 0 });
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

  // Parking the video where the operation starts, so trimming shows its edge.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || seekTo == null || Number.isNaN(seekTo)) return;
    if (Math.abs(video.currentTime - seekTo) > 0.05) video.currentTime = seekTo;
  }, [seekTo, source]);

  if (!path || kind === "none") return null;

  const name = path.split(/[\\/]/).pop() ?? path;

  function reportNatural(width: number, height: number) {
    setNatural({ width, height });
    onNatural?.({ width, height });
  }

  const canCrop = crop && onCropChange && natural.width > 0 && (kind === "image" || kind === "video");

  return (
    <figure className="file-preview">
      <div className="file-preview__stage">
        {failed || !source ? (
          <div className="file-preview__fallback">
            <FileQuestion size={22} aria-hidden="true" />
            <span>{failed ? "This format cannot be shown here" : "Opening preview…"}</span>
          </div>
        ) : kind === "image" ? (
          <img
            src={source}
            alt={`Preview of ${name}`}
            ref={setMedia}
            onLoad={(event) =>
              reportNatural(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)
            }
            onError={() => setFailed(true)}
          />
        ) : kind === "video" ? (
          <video
            src={source}
            controls
            muted
            preload="metadata"
            ref={(element) => {
              videoRef.current = element;
              setMedia(element);
            }}
            onLoadedMetadata={(event) => {
              reportNatural(event.currentTarget.videoWidth, event.currentTarget.videoHeight);
              onDuration?.(event.currentTarget.duration);
            }}
            onError={() => setFailed(true)}
          />
        ) : (
          <audio src={source} controls preload="metadata" onError={() => setFailed(true)} />
        )}

        {canCrop && (
          <CropOverlay media={media} natural={natural} value={crop} onChange={onCropChange} />
        )}
      </div>
      <figcaption>
        <span className="file-preview__name">{name}</span>
        {natural.width > 0 && (
          <span className="file-preview__meta">
            {natural.width} × {natural.height}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
