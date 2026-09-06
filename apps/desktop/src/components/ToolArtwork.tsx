import {
  Braces,
  Archive,
  Crop,
  Download,
  FileCode2,
  FileSearch,
  FileText,
  Files,
  Film,
  FolderSearch,
  SearchCode,
  type LucideIcon,
} from "lucide-react";

const iconByToolId: Record<string, LucideIcon> = {
  qpdf: Files,
  "yt-dlp": Download,
  ffmpeg: Film,
  ffprobe: FileSearch,
  libvips: Crop,
  deno: Braces,
  jq: FileCode2,
  yq: FileCode2,
  ripgrep: SearchCode,
  fd: FolderSearch,
  "7zip": Archive,
  pandoc: FileText,
};

export function ToolArtwork({ toolId }: { toolId: string }) {
  const Icon = iconByToolId[toolId] ?? FileSearch;

  return (
    <div className="tool-artwork" aria-hidden="true">
      <div className="artwork-rail" />
      <Icon strokeWidth={1.35} />
      <div className="artwork-index">{toolId.slice(0, 3).toUpperCase()}</div>
    </div>
  );
}
