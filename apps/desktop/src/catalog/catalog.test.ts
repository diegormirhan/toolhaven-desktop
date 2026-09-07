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
    expect(filterCatalogRows(rows, "recortar")[0]?.tools[0]?.id).toBe("libvips");
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
