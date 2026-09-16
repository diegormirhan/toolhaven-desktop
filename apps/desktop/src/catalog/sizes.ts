import toolManifest from "../../../../tooling/tools.json";

/**
 * How large each component's download is.
 *
 * The rule this exists to keep: a download never starts without the size having
 * been on screen first. The numbers come from the manifest, which records what
 * the release server actually reports, rather than from an estimate that drifts
 * every time a tool is updated.
 */
const sizeByToolId: Record<string, number> = Object.fromEntries(
  toolManifest.tools
    .map((tool) => {
      const artifacts: { sizeBytes?: number }[] =
        ("artifacts" in tool ? tool.artifacts : undefined) ?? [];
      // A tool can be split across several artifacts; the download is all of them.
      const total = artifacts.reduce((sum, artifact) => sum + (artifact.sizeBytes ?? 0), 0);
      return [tool.id, total] as const;
    })
    .filter(([, total]) => total > 0),
);

export function downloadSize(toolId: string): number | null {
  return sizeByToolId[toolId] ?? null;
}

/** Bytes as a person would say them: "1.2 GB", "216 MB", "940 kB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) {
    const megabytes = bytes / 1024 ** 2;
    // No decimal past ten: "216 MB" is the number anyone repeats back.
    return `${megabytes >= 10 ? Math.round(megabytes) : megabytes.toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} kB`;
}
