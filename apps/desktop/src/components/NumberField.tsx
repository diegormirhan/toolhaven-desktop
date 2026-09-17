import { Minus, Plus } from "lucide-react";

/**
 * A number input with a step either side of it.
 *
 * Chromium's own spinners only appear on hover, sit inside the field and are a
 * few pixels tall — two stacked arrows sharing the height of one line of text,
 * which is a target nobody can hit on purpose. These are full-height buttons
 * at either end, so the field reads as something you can nudge, and typing and
 * the arrow keys still work exactly as before.
 */
export function NumberField({
  label,
  value,
  placeholder,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: string) => void;
}) {
  const current = Number(value);

  function nudge(direction: 1 | -1) {
    // An empty or unparseable field starts from the floor rather than NaN.
    const from = Number.isFinite(current) ? current : (min ?? 0);
    let next = from + direction * step;
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    // Rounded to the step's own precision, so 0.1 steps do not drift into
    // 0.30000000000000004.
    const decimals = (String(step).split(".")[1] ?? "").length;
    onChange(next.toFixed(decimals));
  }

  const atFloor = min != null && Number.isFinite(current) && current <= min;
  const atCeiling = max != null && Number.isFinite(current) && current >= max;

  return (
    // The input comes first in the source although the minus sits to its left:
    // a label wrapping this field labels its first form control, and that has
    // to be the number rather than a button nobody needs to hear named.
    <span className="number-field">
      <input
        aria-label={label}
        type="number"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className="number-field__step number-field__step--down"
        tabIndex={-1}
        aria-hidden="true"
        disabled={atFloor}
        onClick={() => nudge(-1)}
      >
        <Minus size={15} />
      </button>
      <button
        type="button"
        className="number-field__step number-field__step--up"
        tabIndex={-1}
        aria-hidden="true"
        disabled={atCeiling}
        onClick={() => nudge(1)}
      >
        <Plus size={15} />
      </button>
    </span>
  );
}
