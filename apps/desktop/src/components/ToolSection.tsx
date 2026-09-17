import {
  createInstallationState,
  type InstallationState,
} from "../../../../scripts/component-installation/installation-state.mjs";
import type { CatalogRow, CatalogTool } from "../catalog/catalog";
import { ToolCard } from "./ToolCard";
import { useT } from "../i18n/language";

type ToolSectionProps = {
  row: CatalogRow;
  installations: Record<string, InstallationState>;
  onOpen: (tool: CatalogTool, trigger: HTMLButtonElement) => void;
  onInstall: (tool: CatalogTool) => void;
};

/**
 * A category as a wrapping grid rather than a sideways rail.
 *
 * Rails suit browsing something you have no particular intent about. Looking
 * for a tool is the opposite: you know what you want and everything parked
 * off-screen is an obstacle. The grid puts every tool in a category on one
 * screen, so finding one is reading rather than scrolling.
 */
/**
 * A card the app itself provides has nothing to install and no manifest entry,
 * so it has no installation state either. It is ready, always, from the moment
 * the window opens.
 */
const builtIn: InstallationState = createInstallationState({ activeVersion: "built-in" });

export function ToolSection({ row, installations, onOpen, onInstall }: ToolSectionProps) {
  const t = useT();
  return (
    <section className="tool-section" id={`section-${row.id}`} aria-labelledby={`${row.id}-heading`}>
      <header className="tool-section__header">
        <h2 id={`${row.id}-heading`}>{t(row.title)}</h2>
        <p>{t(row.description)}</p>
        <span className="tool-section__count">
          {t(row.tools.length === 1 ? "{count} tool" : "{count} tools", { count: row.tools.length })}
        </span>
      </header>
      <div className="tool-section__grid">
        {row.tools.map((tool, index) => (
          <ToolCard
            key={tool.id}
            index={index}
            tool={tool}
            installation={installations[tool.id] ?? builtIn}
            onOpen={onOpen}
            onInstall={onInstall}
          />
        ))}
      </div>
    </section>
  );
}
