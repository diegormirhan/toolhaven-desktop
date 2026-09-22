import type { CatalogRow } from "../catalog/catalog";
import { useT } from "../i18n/language";

type CategoryFilterProps = {
  rows: CatalogRow[];
  active: string | null;
  onChange: (id: string | null) => void;
};

/**
 * Answers "what is here, and where can I go?" before any scrolling happens.
 *
 * Six labels on one line are readable at a glance; the categories they name
 * are not, spread down a long page. Selecting one narrows the page to it
 * rather than jumping, so the answer stays on screen.
 */
export function CategoryFilter({ rows, active, onChange }: CategoryFilterProps) {
  const t = useT();
  if (rows.length === 0) return null;
  const totalTools = rows.reduce((sum, row) => sum + row.tools.length, 0);
  return (
    <div className="category-filter" role="group" aria-label={t("Filter by category")}>
      <button
        type="button"
        className={`category-chip${active === null ? " is-active" : ""}`}
        aria-pressed={active === null}
        onClick={() => onChange(null)}
      >
        {t("Everything")}
        <span className="category-chip__count">{totalTools}</span>
      </button>
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          className={`category-chip${active === row.id ? " is-active" : ""}`}
          aria-pressed={active === row.id}
          onClick={() => onChange(active === row.id ? null : row.id)}
        >
          {t(row.title)}
          <span className="category-chip__count">{row.tools.length}</span>
        </button>
      ))}
    </div>
  );
}
