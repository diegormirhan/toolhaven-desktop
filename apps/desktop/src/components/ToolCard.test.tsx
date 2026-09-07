import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CatalogTool } from "../catalog/catalog";
import { ToolCard } from "./ToolCard";

const tool: CatalogTool = {
  id: "ffmpeg",
  integrationName: "FFmpeg",
  title: "Converter mídia",
  description: "Converta mídia localmente.",
  category: "downloads",
  availability: "available",
  delivery: "on-demand",
  status: "planned",
  accent: "cool",
  size: "standard",
  keywords: [],
  capabilities: [],
  operations: [],
  downloadLabel: "Download interno",
};

describe("ToolCard error state", () => {
  it("explains a recoverable error and offers retry", () => {
    render(
      <ToolCard
        tool={tool}
        installation={{
          availability: "available",
          phase: "idle",
          activeVersion: null,
          candidateVersion: null,
          progress: null,
          lastError: "Não foi possível verificar o arquivo.",
        }}
        onOpen={vi.fn()}
        onInstall={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível verificar o arquivo.");
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeEnabled();
  });
});
