import { Monitor, Moon, Sun } from "lucide-react";
import type { ThemePreference } from "../hooks/useTheme";

type ThemeSwitchProps = {
  preference: ThemePreference;
  onChange: (preference: ThemePreference) => void;
  variant?: "compact" | "labelled";
};

const options: Array<{ id: ThemePreference; label: string; icon: typeof Sun }> = [
  { id: "system", label: "Sistema", icon: Monitor },
  { id: "light", label: "Claro", icon: Sun },
  { id: "dark", label: "Escuro", icon: Moon },
];

export function ThemeSwitch({ preference, onChange, variant = "compact" }: ThemeSwitchProps) {
  return (
    <div
      className={`theme-switch theme-switch--${variant}`}
      role="radiogroup"
      aria-label="Tema da interface"
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
            aria-label={`Tema ${option.label.toLocaleLowerCase("pt-BR")}`}
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
