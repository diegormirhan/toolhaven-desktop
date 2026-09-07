import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { ToolPanel } from "./components/ToolPanel";
import { createCatalogRows } from "./catalog/catalog";

describe("desktop catalog", () => {
  it("offers to install a pinned component without leaving the app", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /ver disponibilidade de qpdf/i }));

    const dialog = screen.getByRole("dialog", { name: /instalar qpdf/i });
    expect(within(dialog).getByText(/não precisa sair do aplicativo/i)).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Baixar e instalar" })).toBeEnabled();
  });

  it("does not offer to install a tool whose artifact is not pinned yet", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /ver disponibilidade de 7-zip/i }));

    const dialog = screen.getByRole("dialog", { name: /instalar 7-zip/i });
    expect(within(dialog).getByText(/ainda não tem artefato versionado/i)).toBeVisible();
    expect(within(dialog).queryByRole("button", { name: "Baixar e instalar" })).not.toBeInTheDocument();
  });

  it("shows the complete dependency plan before installing", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /ver disponibilidade de yt-dlp/i }));

    const panel = screen.getByRole("dialog", { name: /instalar yt-dlp/i });
    expect(within(panel).getByText("Deno")).toBeVisible();
    expect(within(panel).getByText("FFmpeg")).toBeVisible();
    expect(within(panel).getByText("ffprobe")).toBeVisible();
    expect(within(panel).getByText(/SHA-256 conferido antes de ativar/i)).toBeVisible();
    expect(within(panel).getByRole("button", { name: "Baixar e instalar" })).toBeEnabled();
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

  it("keeps the theme choice on the document root", async () => {
    window.localStorage.clear();
    render(<App />);
    const user = userEvent.setup();
    const themes = screen.getByRole("radiogroup", { name: "Tema da interface" });

    await user.click(within(themes).getByRole("radio", { name: "Tema escuro" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(within(themes).getByRole("radio", { name: "Tema escuro" })).toHaveAttribute("aria-checked", "true");

    await user.click(within(themes).getByRole("radio", { name: "Tema claro" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem("toolhaven.theme-preference")).toBe("light");
  });

  it("offers the same theme control in the settings view", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Ajustes" }));

    expect(screen.getByRole("heading", { name: "Tema" })).toBeVisible();
    expect(screen.getAllByRole("radiogroup", { name: "Tema da interface" })).toHaveLength(2);
    expect(screen.getByText(/cancelamento de operações em andamento/i)).toBeVisible();
  });

  it("explains that the queue survives closing a tool panel", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Fila" }));

    expect(screen.getByText(/continuam aqui mesmo depois de você fechar o painel/i)).toBeVisible();
  });

});
