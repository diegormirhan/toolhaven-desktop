import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { ToolPanel } from "./components/ToolPanel";
import { createCatalogRows } from "./catalog/catalog";

describe("desktop catalog", () => {
  it("explains when a planned tool is not available on the host", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /ver disponibilidade de qpdf/i }));

    const dialog = screen.getByRole("dialog", { name: /instalar qpdf/i });
    expect(within(dialog).getByText(/não foi detectado/i)).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Fechar plano" })).toBeVisible();
  });

  it("shows the complete dependency plan without faking an install", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /ver disponibilidade de yt-dlp/i }));

    const panel = screen.getByRole("dialog", { name: /instalar yt-dlp/i });
    expect(within(panel).getByText("Deno")).toBeVisible();
    expect(within(panel).getByText("FFmpeg")).toBeVisible();
    expect(within(panel).getByText("ffprobe")).toBeVisible();
    expect(within(panel).getByText(/artefato versionado e hash publicado/i)).toBeVisible();
    expect(within(panel).queryByRole("button", { name: /iniciar download/i })).not.toBeInTheDocument();
  });

  it("filters the catalog from the global search", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.type(screen.getByRole("searchbox"), "pdf");

    expect(screen.getByText("Arquivos, imagens e documentos")).toBeVisible();
    expect(screen.queryByText("Mídia e downloads")).not.toBeInTheDocument();
  });

  it("closes the detail panel with Escape", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /ver disponibilidade de qpdf/i }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: /instalar qpdf/i })).not.toBeInTheDocument();
  });

  it("focuses the global search with Ctrl+K", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.keyboard("{Control>}k{/Control}");

    expect(screen.getByRole("searchbox")).toHaveFocus();
  });

  it("lets the user choose an operation in an available tool panel", async () => {
    render(<App />);
    const user = userEvent.setup();
    const tool = createCatalogRows().flatMap((row) => row.tools).find((item) => item.id === "qpdf");
    if (!tool) throw new Error("qpdf catalog entry missing");
    render(<ToolPanel tool={tool} onClose={vi.fn()} />);
    const panel = screen.getByRole("dialog", { name: "Organizar PDFs" });
    expect(within(panel).getByRole("combobox", { name: "Operação" })).toHaveValue("merge");
    expect(within(panel).getByRole("option", { name: "Dividir páginas" })).toBeInTheDocument();
    await user.selectOptions(within(panel).getByRole("combobox", { name: "Operação" }), "rotate");
    expect(within(panel).getByLabelText("Graus")).toHaveValue(90);
  });

  it("accepts a media URL for yt-dlp", async () => {
    const tool = createCatalogRows().flatMap((row) => row.tools).find((item) => item.id === "yt-dlp");
    if (!tool) throw new Error("yt-dlp catalog entry missing");
    render(<ToolPanel tool={tool} onClose={vi.fn()} />);
    const user = userEvent.setup();
    const panel = screen.getByRole("dialog", { name: "Baixar mídia" });
    const execute = within(panel).getByRole("button", { name: "Executar" });
    expect(execute).toBeDisabled();
    await user.type(within(panel).getByLabelText("URL de mídia"), "https://example.com/video");
    expect(execute).toBeEnabled();
  });

  it("does not claim a browser operation succeeded", async () => {
    render(<App />);
    const user = userEvent.setup();
    const tool = createCatalogRows().flatMap((row) => row.tools).find((item) => item.id === "qpdf");
    if (!tool) throw new Error("qpdf catalog entry missing");
    render(<ToolPanel tool={tool} onClose={vi.fn()} />);
    const panel = screen.getByRole("dialog", { name: "Organizar PDFs" });
    await user.upload(within(panel).getByLabelText("Escolher arquivos"), new File(["pdf"], "contrato.pdf", { type: "application/pdf" }));
    await user.click(within(panel).getByRole("button", { name: "Executar" }));
    expect(within(panel).getByRole("alert")).toHaveTextContent(/abra o app workbench/i);
  });
});
