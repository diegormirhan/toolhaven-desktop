import { Monitor, Moon, Sun } from "lucide-react";
import type { ThemePreference } from "../hooks/useTheme";
import { useT } from "../i18n/language";

type ThemeSwitchProps = {
  preference: ThemePreference;
  onChange: (preference: ThemePreference) => void;
  variant?: "compact" | "labelled";
};

const options: Array<{ id: ThemePreference; label: string; icon: typeof Sun }> = [
  { id: "system", label: "System", icon: Monitor },
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
];

export function ThemeSwitch({ preference, onChange, variant = "compact" }: ThemeSwitchProps) {
  const t = useT();
  return (
    <div
      className={`theme-switch theme-switch--${variant}`}
      role="radiogroup"
      aria-label={t("Interface theme")}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const selected = preference === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t("{name} theme", { name: t(option.label) })}
            title={t(option.label)}
            className={selected ? "theme-switch__option theme-switch__option--selected" : "theme-switch__option"}
            onClick={() => onChange(option.id)}
          >
            <Icon size={15} aria-hidden="true" />
            {variant === "labelled" && <span>{t(option.label)}</span>}
          </button>
        );
      })}
    </div>
  );
}
