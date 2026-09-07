import { ChevronLeft, ChevronRight } from "lucide-react";
import type { InstallationState } from "../../../../scripts/component-installation/installation-state.mjs";
import type { CatalogRow, CatalogTool } from "../catalog/catalog";
import { useDragRail } from "../hooks/useDragRail";
import { ToolCard } from "./ToolCard";

type ToolRailProps = {
  row: CatalogRow;
  installations: Record<string, InstallationState>;
  onOpen: (tool: CatalogTool, trigger: HTMLButtonElement) => void;
  onInstall: (tool: CatalogTool) => void;
};

export function ToolRail({ row, installations, onOpen, onInstall }: ToolRailProps) {
  const rail = useDragRail();
  const hasOverflow = rail.scrollable.start || rail.scrollable.end;

  return (
    <section className="catalog-row" aria-labelledby={`${row.id}-heading`}>
      <div className="catalog-row__header">
        <div>
          <h2 id={`${row.id}-heading`}>{row.title}</h2>
          <p>{row.description}</p>
        </div>
        <div className="rail-controls" aria-label={`Browse ${row.title}`} hidden={!hasOverflow}>
          <button
            type="button"
            onClick={() => rail.scrollByPage(-1)}
            disabled={!rail.scrollable.start}
            aria-label="Previous cards"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => rail.scrollByPage(1)}
            disabled={!rail.scrollable.end}
            aria-label="Next cards"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        className="tool-rail"
        ref={rail.railRef}
        onScroll={rail.onScroll}
        onPointerDown={rail.onPointerDown}
        onPointerMove={rail.onPointerMove}
        onPointerUp={rail.onPointerUp}
        onPointerCancel={rail.onPointerUp}
      >
        <div className="tool-rail__track" ref={rail.trackRef}>
          {row.tools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              installation={installations[tool.id]!}
              onOpen={onOpen}
              onInstall={onInstall}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
