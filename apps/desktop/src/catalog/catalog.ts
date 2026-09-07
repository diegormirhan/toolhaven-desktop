import toolManifest from "../../../../tooling/tools.json";
import type { InstallationState } from "../../../../scripts/component-installation/installation-state.mjs";

export type ToolAccent = "action" | "cool" | "amber" | "neutral";

export type ToolOperation = { id: string; label: string; description: string };

export type CatalogTool = {
  id: string;
  integrationName: string;
  title: string;
  description: string;
  category: string;
  availability: InstallationState["availability"];
  delivery: "embedded" | "on-demand";
  status: "planned" | "bundled" | "downloadable";
  accent: ToolAccent;
  size: "standard" | "wide" | "compact";
  keywords: string[];
  capabilities: string[];
  operations: ToolOperation[];
  downloadLabel?: string;
};

export type CatalogRow = {
  id: string;
  title: string;
  description: string;
  tools: CatalogTool[];
};

const presentationById: Record<
  string,
  Omit<CatalogTool, "integrationName" | "delivery" | "status" | "availability" | "capabilities">
> = {
  qpdf: {
    id: "qpdf",
    title: "Organise PDFs",
    description: "Merge, split, rotate, protect and optimise documents.",
    category: "documents",
    accent: "amber",
    size: "wide",
    operations: [
      { id: "merge", label: "Merge PDFs", description: "Join several documents into one file." },
      { id: "split", label: "Split pages", description: "Pull pages out into new files." },
      { id: "rotate", label: "Rotate pages", description: "Fix the orientation of the document." },
      { id: "protect", label: "Protect document", description: "Add a password to the PDF." },
      { id: "linearize", label: "Optimise for web", description: "Prepare the PDF for progressive loading." },
    ],
    keywords: ["pdf", ".pdf", "merge", "split", "rotate", "document", "password"],
  },
  poppler: {
    id: "poppler",
    title: "Extract from PDFs",
    description: "Pull the text out of a document, or turn a page into an image.",
    category: "documents",
    accent: "amber",
    size: "standard",
    operations: [
      { id: "extract-text", label: "Extract text", description: "Save the PDF text with its layout preserved." },
      { id: "rasterize", label: "Page as image", description: "Render a chosen page to PNG." },
    ],
    keywords: ["pdf", ".pdf", "text", "rasterize", "page", "image", "document"],
    downloadLabel: "In-app download",
  },
  libvips: {
    id: "libvips",
    title: "Adjust images",
    description: "Resize, crop, compress and convert images.",
    category: "images",
    accent: "cool",
    size: "wide",
    operations: [
      { id: "resize", label: "Resize", description: "Change width and height, keeping the aspect ratio." },
      { id: "crop", label: "Crop", description: "Pick an exact region of the image." },
      { id: "compress", label: "Compress image", description: "Trade quality for size, with the dial in view." },
      { id: "convert", label: "Convert format", description: "Export to the common image formats." },
      { id: "upscale", label: "Upscale", description: "Enlarge with Lanczos resampling. No AI, no invented detail." },
    ],
    keywords: ["image", "photo", "resize", "crop", "compress", "convert", "upscale"],
    downloadLabel: "In-app download",
  },
  imagemagick: {
    id: "imagemagick",
    title: "Image formats",
    description: "Convert between formats the other tools do not reach, and inspect the details.",
    category: "images",
    accent: "cool",
    size: "standard",
    operations: [
      { id: "convert", label: "Convert format", description: "The destination extension decides the output format." },
      { id: "grayscale", label: "Convert to grey", description: "Drop the colour, keep the luminance." },
      { id: "inspect", label: "Inspect image", description: "Format, dimensions, profile and channels." },
    ],
    keywords: ["image", "convert", "format", "tiff", "heic", "psd", "grey", "inspect"],
    downloadLabel: "In-app download",
  },
  oxipng: {
    id: "oxipng",
    title: "Optimise PNG",
    description: "Make PNGs smaller without losing a pixel.",
    category: "images",
    accent: "neutral",
    size: "compact",
    operations: [
      { id: "optimize", label: "Lossless optimise", description: "Recompress the PNG, pixel for pixel identical." },
    ],
    keywords: ["png", "optimise", "optimize", "compress", "image", "lossless"],
  },
  exiftool: {
    id: "exiftool",
    title: "Metadata",
    description: "Read, strip or edit the metadata in photos, video and documents.",
    category: "files",
    accent: "amber",
    size: "standard",
    operations: [
      { id: "inspect", label: "Read metadata", description: "List every tag found in the file." },
      { id: "strip", label: "Remove metadata", description: "Write a copy with no EXIF, GPS or other tags." },
      { id: "set-title", label: "Set title", description: "Write a title into a new copy of the file." },
    ],
    keywords: ["metadata", "exif", "gps", "title", "photo", "strip", "privacy"],
    downloadLabel: "In-app download",
  },
  "yt-dlp": {
    id: "yt-dlp",
    title: "Download media",
    description: "Save video or audio from a supported URL.",
    category: "downloads",
    accent: "action",
    size: "wide",
    operations: [
      { id: "download-video", label: "Download video", description: "Take the best quality available." },
      { id: "download-audio", label: "Extract audio", description: "Keep the audio track only." },
      { id: "inspect-url", label: "Inspect URL", description: "See the formats before downloading." },
    ],
    keywords: ["youtube", "url", "download", "video", "audio", "media"],
    downloadLabel: "With dependencies",
  },
  ffmpeg: {
    id: "ffmpeg",
    title: "Convert media",
    description: "Convert, compress, trim or pull the audio out of a file.",
    category: "downloads",
    accent: "cool",
    size: "standard",
    operations: [
      { id: "convert", label: "Convert format", description: "Change the container, leave the original alone." },
      { id: "extract-audio", label: "Extract audio", description: "Write an audio file from the video." },
      { id: "compress", label: "Compress media", description: "Shrink it with an explicit quality setting." },
      { id: "trim", label: "Trim a section", description: "Set start and end, avoiding a re-encode where possible." },
    ],
    keywords: ["video", "audio", "convert", "compress", "trim", "transcode"],
    downloadLabel: "In-app download",
  },
  mkvtoolnix: {
    id: "mkvtoolnix",
    title: "Package Matroska",
    description: "Convert to MKV and inspect tracks without re-encoding.",
    category: "downloads",
    accent: "cool",
    size: "standard",
    operations: [
      { id: "remux", label: "Convert to MKV", description: "Swap the container, keep the original tracks." },
      { id: "inspect", label: "Inspect tracks", description: "List tracks, languages and codecs as JSON." },
    ],
    keywords: ["mkv", "matroska", "remux", "track", "subtitle", "container"],
    downloadLabel: "In-app download",
  },
  ffprobe: {
    id: "ffprobe",
    title: "Inspect media",
    description: "See codecs, tracks, dimensions and technical metadata.",
    category: "downloads",
    accent: "neutral",
    size: "compact",
    operations: [{ id: "inspect", label: "Inspect file", description: "Read codecs, tracks and technical metadata." }],
    keywords: ["codec", "metadata", "inspect", "video", "audio"],
    downloadLabel: "In-app download",
  },
  jq: {
    id: "jq",
    title: "Format JSON",
    description: "Query, filter and format JSON without opening an editor.",
    category: "developer",
    accent: "cool",
    size: "standard",
    operations: [
      { id: "format", label: "Format JSON", description: "Indent and validate a JSON file." },
      { id: "query", label: "Query JSON", description: "Pull fields out with a jq expression." },
    ],
    keywords: ["json", "format", "query", "filter"],
  },
  yq: {
    id: "yq",
    title: "Work with YAML",
    description: "Format, query and convert YAML and JSON.",
    category: "developer",
    accent: "amber",
    size: "standard",
    operations: [
      { id: "format", label: "Format YAML", description: "Indent and normalise a YAML file." },
      { id: "query", label: "Query YAML", description: "Pull fields out with a yq expression." },
    ],
    keywords: ["yaml", "yml", "json", "format", "query"],
  },
  miller: {
    id: "miller",
    title: "Spreadsheets and CSV",
    description: "Convert between CSV, TSV and JSON, and summarise the columns.",
    category: "developer",
    accent: "amber",
    size: "wide",
    operations: [
      { id: "to-json", label: "CSV to JSON", description: "Read a CSV and see the records as JSON." },
      { id: "to-csv", label: "JSON to CSV", description: "Flatten a JSON of records into columns." },
      { id: "summary", label: "Summarise columns", description: "Type, count, nulls, minimum and maximum per column." },
    ],
    keywords: ["csv", "tsv", "json", "spreadsheet", "table", "column", "data"],
  },
  difftastic: {
    id: "difftastic",
    title: "Compare files",
    description: "A structural diff: it compares the syntax, not just the lines.",
    category: "developer",
    accent: "action",
    size: "standard",
    operations: [
      { id: "compare", label: "Compare two files", description: "Pick two files and see what actually changed." },
    ],
    keywords: ["diff", "compare", "difference", "syntax", "code", "merge"],
    downloadLabel: "In-app download",
  },
  ripgrep: {
    id: "ripgrep",
    title: "Search a project",
    description: "Find text and patterns across folders, fast.",
    category: "developer",
    accent: "action",
    size: "wide",
    operations: [
      { id: "search", label: "Search text", description: "Match patterns, skipping the folders that never matter." },
    ],
    keywords: ["grep", "search", "text", "regex", "code"],
  },
  fd: {
    id: "fd",
    title: "Find files",
    description: "Locate files by name, extension or path.",
    category: "developer",
    accent: "neutral",
    size: "compact",
    operations: [{ id: "find", label: "Find files", description: "Filter paths without writing a command." }],
    keywords: ["find", "file", "folder", "search", "path"],
  },
  tokei: {
    id: "tokei",
    title: "Count code",
    description: "See lines, comments and files per language in a project.",
    category: "developer",
    accent: "cool",
    size: "standard",
    operations: [
      { id: "count", label: "Count by language", description: "Total files, code, comments and blank lines." },
    ],
    keywords: ["lines", "code", "statistics", "language", "project", "loc"],
  },
  hexyl: {
    id: "hexyl",
    title: "View bytes",
    description: "Inspect the start of a file in hexadecimal.",
    category: "developer",
    accent: "neutral",
    size: "compact",
    operations: [{ id: "preview", label: "Hex preview", description: "Show the first bytes beside their ASCII." }],
    keywords: ["hex", "hexadecimal", "bytes", "binary", "signature", "magic"],
  },
  dust: {
    id: "dust",
    title: "Disk usage",
    description: "Find out which folders are taking the space.",
    category: "files",
    accent: "amber",
    size: "standard",
    operations: [{ id: "usage", label: "Largest folders", description: "List what weighs most inside a folder." }],
    keywords: ["disk", "space", "size", "folder", "cleanup", "du"],
  },
  "7zip": {
    id: "7zip",
    title: "Compress files",
    description: "Create and extract 7z, zip and the common archive formats.",
    category: "files",
    accent: "amber",
    size: "standard",
    operations: [
      { id: "compress", label: "Compress", description: "Create an archive." },
      { id: "extract", label: "Extract", description: "Unpack the contents into a folder." },
    ],
    keywords: ["zip", "7z", "rar", "compress", "extract", "archive"],
  },
  pandoc: {
    id: "pandoc",
    title: "Convert documents",
    description: "Convert Markdown and documents between open formats.",
    category: "documents",
    accent: "cool",
    size: "wide",
    operations: [{ id: "convert", label: "Convert document", description: "Choose the input and output formats." }],
    keywords: ["markdown", "docx", "html", "epub", "document"],
    downloadLabel: "In-app download",
  },
  deno: {
    id: "deno",
    title: "Download runtime",
    description: "An isolated component the download integrations rely on.",
    category: "developer",
    accent: "neutral",
    size: "compact",
    operations: [
      { id: "runtime", label: "Show installed version", description: "Report the Deno version available on this Windows." },
    ],
    keywords: ["deno", "runtime", "javascript"],
    downloadLabel: "Component",
  },
};

const rowDefinitions = [
  {
    id: "included",
    title: "Files, images and documents",
    description: "Local operations, organised by the result you are after.",
    toolIds: ["qpdf", "poppler", "libvips", "imagemagick", "oxipng", "exiftool"],
  },
  {
    id: "downloads",
    title: "Media and downloads",
    description: "Local conversion, and downloads installed when you need them.",
    toolIds: ["yt-dlp", "ffmpeg", "mkvtoolnix", "ffprobe"],
  },
  {
    id: "developer",
    title: "Dev tools and archives",
    description: "Small tools for text, projects and compressed formats.",
    toolIds: ["jq", "yq", "miller", "difftastic", "ripgrep", "fd", "tokei", "hexyl", "dust", "7zip", "pandoc", "deno"],
  },
] as const;

export function createCatalogRows(): CatalogRow[] {
  const manifestTools = new Map(toolManifest.tools.map((tool) => [tool.id, tool]));

  return rowDefinitions.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    tools: row.toolIds.map((toolId) => {
      const manifestTool = manifestTools.get(toolId);
      const presentation = presentationById[toolId];

      if (!manifestTool || !presentation) {
        throw new Error(`Missing catalog presentation for ${toolId}`);
      }

      return {
        ...presentation,
        integrationName: manifestTool.displayName,
        delivery: requireDelivery(manifestTool.delivery),
        status: requireStatus(manifestTool.status),
        availability: manifestTool.status === "bundled" ? "ready" : "available",
        capabilities: manifestTool.capabilities,
        operations: presentation.operations,
      };
    }),
  }));
}

function requireStatus(value: string): CatalogTool["status"] {
  if (value === "planned" || value === "bundled" || value === "downloadable") return value;
  throw new Error(`Unsupported tool status: ${value}`);
}

function requireDelivery(value: string): CatalogTool["delivery"] {
  if (value === "embedded" || value === "on-demand") return value;
  throw new Error(`Unsupported delivery strategy: ${value}`);
}

export function filterCatalogRows(rows: CatalogRow[], rawQuery: string): CatalogRow[] {
  const query = normalizeSearch(rawQuery);
  if (!query) return rows;

  return rows
    .map((row) => ({
      ...row,
      tools: row.tools.filter((tool) => searchableText(tool).includes(query)),
    }))
    .filter((row) => row.tools.length > 0);
}

function searchableText(tool: CatalogTool): string {
  return normalizeSearch(
    [tool.integrationName, tool.title, tool.description, ...tool.keywords, ...tool.capabilities].join(" "),
  );
}

/** Accents are stripped so a search still matches whatever the user's keyboard produces. */
function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("en-US")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
