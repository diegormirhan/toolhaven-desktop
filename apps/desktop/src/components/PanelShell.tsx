import { forwardRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useT } from "../i18n/language";

/**
 * The modal frame every tool opens inside: the title bar, the close button, and
 * the exit animation that has to finish before the panel is unmounted.
 *
 * Extracted when the second and third panels arrived. Three copies of an
 * animation contract is three places for a modal to get stuck half-closed.
 */
export const PanelShell = forwardRef<
  HTMLButtonElement,
  {
    title: string;
    wide?: boolean;
    leaving?: boolean;
    onClose: () => void;
    onExited?: () => void;
    bodyClassName?: string;
    children: ReactNode;
  }
>(function PanelShell({ title, wide = false, leaving = false, onClose, onExited, bodyClassName = "", children }, closeRef) {
  const t = useT();
  return (
    <aside
      className={`tool-panel${wide ? " tool-panel--wide" : ""}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="tool-panel-title"
      data-leaving={leaving ? "true" : undefined}
      onAnimationEnd={(event) => {
        if (leaving && event.animationName.includes("panel-exit")) onExited?.();
      }}
    >
      <div className="tool-panel__topbar">
        <span>{title}</span>
        <button ref={closeRef} className="icon-button" type="button" onClick={onClose} aria-label={t("Close tool")}>
          <X size={18} />
        </button>
      </div>
      <div className={`tool-panel__body${bodyClassName ? ` ${bodyClassName}` : ""}`}>{children}</div>
    </aside>
  );
});
