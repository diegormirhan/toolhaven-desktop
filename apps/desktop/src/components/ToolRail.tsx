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
  const dragRail = useDragRail();

  return (
    <section className="catalog-row" aria-labelledby={`${row.id}-heading`}>
      <div className="catalog-row__header">
        <div>
          <h2 id={`${row.id}-heading`}>{row.title}</h2>
          <p>{row.description}</p>
        </div>
        {row.tools.length > 1 && (
          <div className="rail-controls" aria-label={`Navegar por ${row.title}`}>
            <button type="button" onClick={() => dragRail.scrollByPage(-1)} aria-label="Cards anteriores">
              <ChevronLeft size={18} />
            </button>
            <button type="button" onClick={() => dragRail.scrollByPage(1)} aria-label="Próximos cards">
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
      <div
        className="tool-rail"
        ref={dragRail.railRef}
        onPointerDown={dragRail.onPointerDown}
        onPointerMove={dragRail.onPointerMove}
        onPointerUp={dragRail.onPointerUp}
        onPointerCancel={dragRail.onPointerUp}
      >
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
    </section>
  );
}
