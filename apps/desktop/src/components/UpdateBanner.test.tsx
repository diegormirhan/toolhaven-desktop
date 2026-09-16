import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UpdateBanner } from "./UpdateBanner";

function show(state: Parameters<typeof UpdateBanner>[0]["state"]) {
  return render(<UpdateBanner state={state} onRestart={vi.fn()} onDismiss={vi.fn()} />);
}

describe("UpdateBanner", () => {
  it("says nothing while a check is only answering a button in Settings", () => {
    const { container, rerender } = show({ phase: "checking" });
    expect(container).toBeEmptyDOMElement();

    rerender(<UpdateBanner state={{ phase: "current" }} onRestart={vi.fn()} onDismiss={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("offers the restart only once the download has finished", () => {
    show({ phase: "downloading", version: "2.1.1", progress: 0.5 });
    expect(screen.getByRole("status")).toHaveTextContent("2.1.1 — 50%");
    expect(screen.queryByRole("button", { name: "Restart" })).toBeNull();
  });

  it("names the version that is waiting, and warns what a restart costs", () => {
    show({ phase: "ready", version: "2.1.1" });
    expect(screen.getByRole("status")).toHaveTextContent("Version 2.1.1 is installed");
    expect(screen.getByRole("status")).toHaveTextContent("anything running now will be lost");
    expect(screen.getByRole("button", { name: "Restart" })).toBeTruthy();
  });
});
