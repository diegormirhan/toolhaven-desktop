import { Monitor, Moon, Sun } from "lucide-react";
import type { ThemePreference } from "../hooks/useTheme";

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
  return (
    <div
      className={`theme-switch theme-switch--${variant}`}
      role="radiogroup"
      aria-label="Interface theme"
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
            aria-label={`${option.label} theme`}
            title={option.label}
            className={selected ? "theme-switch__option theme-switch__option--selected" : "theme-switch__option"}
            onClick={() => onChange(option.id)}
          >
            <Icon size={15} aria-hidden="true" />
            {variant === "labelled" && <span>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
