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

    await user.click(screen.getByRole("button", { name: /get qpdf/i }));

    const dialog = screen.getByRole("dialog", { name: /install qpdf/i });
    expect(within(dialog).getByText(/never leave the app/i)).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Download and install" })).toBeEnabled();
  });

  it("does not offer to install a tool whose artifact is not pinned yet", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /get 7-zip/i }));

    const dialog = screen.getByRole("dialog", { name: /install 7-zip/i });
    expect(within(dialog).getByText(/no pinned artifact and hash yet/i)).toBeVisible();
    expect(within(dialog).queryByRole("button", { name: "Download and install" })).not.toBeInTheDocument();
  });

  it("shows the complete dependency plan before installing", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /get yt-dlp/i }));

    const panel = screen.getByRole("dialog", { name: /install yt-dlp/i });
    expect(within(panel).getByText("Deno")).toBeVisible();
    expect(within(panel).getByText("FFmpeg")).toBeVisible();
    expect(within(panel).getByText("ffprobe")).toBeVisible();
    expect(within(panel).getByText(/SHA-256 checked before anything is activated/i)).toBeVisible();
    expect(within(panel).getByRole("button", { name: "Download and install" })).toBeEnabled();
  });

  it("filters the catalog from the global search", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.type(screen.getByRole("searchbox"), "pdf");

    expect(screen.getByText("Files, images and documents")).toBeVisible();
    expect(screen.queryByText("Media and downloads")).not.toBeInTheDocument();
  });

  it("closes the detail panel with Escape", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /get qpdf/i }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: /install qpdf/i })).not.toBeInTheDocument();
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
    const panel = screen.getByRole("dialog", { name: "Organise PDFs" });
    expect(within(panel).getByRole("combobox", { name: "Operation" })).toHaveValue("merge");
    expect(within(panel).getByRole("option", { name: "Split pages" })).toBeInTheDocument();
    await user.selectOptions(within(panel).getByRole("combobox", { name: "Operation" }), "rotate");
    expect(within(panel).getByLabelText("Degrees")).toHaveValue(90);
  });

  it("accepts a media URL for yt-dlp", async () => {
    const tool = createCatalogRows().flatMap((row) => row.tools).find((item) => item.id === "yt-dlp");
    if (!tool) throw new Error("yt-dlp catalog entry missing");
    render(<ToolPanel tool={tool} onClose={vi.fn()} />);
    const user = userEvent.setup();
    const panel = screen.getByRole("dialog", { name: "Download media" });
    const execute = within(panel).getByRole("button", { name: "Run" });
    expect(execute).toBeDisabled();
    await user.type(within(panel).getByLabelText("Media URL"), "https://example.com/video");
    expect(execute).toBeEnabled();
  });

  it("keeps the theme choice on the document root", async () => {
    window.localStorage.clear();
    render(<App />);
    const user = userEvent.setup();
    const themes = screen.getByRole("radiogroup", { name: "Interface theme" });

    await user.click(within(themes).getByRole("radio", { name: "Dark theme" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(within(themes).getByRole("radio", { name: "Dark theme" })).toHaveAttribute("aria-checked", "true");

    await user.click(within(themes).getByRole("radio", { name: "Light theme" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem("toolhaven.theme-preference")).toBe("light");
  });

  it("offers the same theme control in the settings view", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(screen.getByRole("heading", { name: "Theme" })).toBeVisible();
    expect(screen.getAllByRole("radiogroup", { name: "Interface theme" })).toHaveLength(2);
    expect(screen.getByText(/cancelling an operation that is already running/i)).toBeVisible();
  });

  it("explains that the queue survives closing a tool panel", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Queue" }));

    expect(screen.getByText(/keeps running here after you close the panel/i)).toBeVisible();
  });

});
