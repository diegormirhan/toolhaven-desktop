import { ChevronDown, ChevronUp } from "lucide-react";

/**
 * A number input with the steppers the native one hides.
 *
 * Chromium's own spinners only appear on hover, sit inside the field, and are
 * a few pixels tall — so a numeric field reads as a plain text box until the
 * pointer happens to land on it. These are always there and large enough to
 * hit, and the field still takes typing and arrow keys as it did.
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
      <span className="number-field__steppers">
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          disabled={atCeiling}
          onClick={() => nudge(1)}
        >
          <ChevronUp size={13} />
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          disabled={atFloor}
          onClick={() => nudge(-1)}
        >
          <ChevronDown size={13} />
        </button>
      </span>
    </span>
  );
}
