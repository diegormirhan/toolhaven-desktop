import { describe, expect, it } from "vitest";
import { createCatalogRows, filterCatalogRows } from "./catalog";

describe("tool catalog", () => {
  it("does not present planned integrations as installed", () => {
    const rows = createCatalogRows();
    const tools = rows.flatMap((row) => row.tools);

    expect(tools.find((tool) => tool.id === "qpdf")?.availability).toBe("available");
    expect(tools.find((tool) => tool.id === "yt-dlp")?.availability).toBe("available");
  });

  it("finds tools by name, capability and file extension", () => {
    const rows = createCatalogRows();

    expect(filterCatalogRows(rows, "youtube")[0]?.tools[0]?.id).toBe("yt-dlp");
    expect(filterCatalogRows(rows, ".pdf")[0]?.tools[0]?.id).toBe("qpdf");
    expect(filterCatalogRows(rows, "crop")[0]?.tools[0]?.id).toBe("libvips");
  });

  it("removes empty rows from search results", () => {
    const rows = filterCatalogRows(createCatalogRows(), "youtube");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("downloads");
  });

  it("exposes concrete operations for each tool", () => {
    const tools = createCatalogRows().flatMap((row) => row.tools);
    expect(tools.find((tool) => tool.id === "ffmpeg")?.operations.map((operation) => operation.id)).toEqual([
      "convert", "extract-audio", "compress", "trim",
    ]);
    expect(tools.find((tool) => tool.id === "yt-dlp")?.operations).toHaveLength(3);
  });

  it("includes the essential developer tools in a dedicated rail", () => {
    const row = createCatalogRows().find((candidate) => candidate.id === "developer");
    expect(row?.tools.map((tool) => tool.id)).toEqual([
      "jq", "yq", "miller", "difftastic", "ripgrep", "fd", "tokei", "hexyl", "dust", "7zip", "pandoc", "deno",
    ]);
  });
});

it('finds the right downloader by the name of the site', () => {
  const rows = createCatalogRows();
  const idsFor = (query: string) =>
    filterCatalogRows(rows, query).flatMap((row) => row.tools.map((tool) => tool.id));

  // Nobody is going to read a list of 1800 supported sites, so the platform
  // names are search keywords instead.
  expect(idsFor('pixiv')).toContain('gallery-dl');
  expect(idsFor('deviantart')).toContain('gallery-dl');
  expect(idsFor('twitch')).toContain('yt-dlp');
  expect(idsFor('tiktok')).toContain('yt-dlp');
  // A site both tools cover should offer both.
  expect(idsFor('reddit')).toEqual(expect.arrayContaining(['yt-dlp', 'gallery-dl']));
});

it('carries gallery-dl as an on-demand download under a copyleft licence', () => {
  const tool = createCatalogRows()
    .flatMap((row) => row.tools)
    .find((entry) => entry.id === 'gallery-dl');

  expect(tool).toBeDefined();
  // GPL-2.0 keeps it out of the installer; it is fetched on demand instead.
  expect(tool?.status).toBe('downloadable');
  expect(tool?.delivery).toBe('on-demand');
  expect(tool?.operations.map((operation) => operation.id)).toEqual([
    'download-gallery',
    'inspect-url',
  ]);
});
