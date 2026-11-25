import { useEffect, useState } from "react";

type Props = {
  id: string;
  label: string;
  // The stored value; null = no objective (RM-022)
  value: number | null;
  // Called with valid values only (or null when the field is emptied)
  onChange: (value: number | null) => void;
  // Returns the message for a value out of its limits, null when fine
  validate: (value: number | null) => string | null;
  // Tells the parent whether the field currently shows an error
  onErrorChange?: (error: string | null) => void;
  // What the − and + buttons add or remove
  step: number;
  min: number;
  max: number;
  // Decimal keyboard (weight, distance, speed) or digits only (reps)
  decimal?: boolean;
  // Unit shown on screen when it differs from the stored one (km for meters)
  toDisplay?: (stored: number) => number;
  fromDisplay?: (shown: number) => number;
};

// "40" on screen for 40, "0,5" for 0.5 (French comma, up to 3 decimals).
function formatNumber(value: number | null): string {
  return value === null
    ? ""
    : String(Math.round(value * 1000) / 1000).replace(".", ",");
}

// Accepts "40", "40,5" and "40.5"; NaN when it is not a number.
function parseNumber(text: string): number {
  return Number(text.trim().replace(",", "."));
}

// A number with a − and a + button around it. Typing is free (the keyboard is
// numeric on a phone); the value goes to the draft only when it is valid, the
// message stays under the field otherwise.
function NumberField({
  id,
  label,
  value,
  onChange,
  validate,
  onErrorChange,
  step,
  min,
  max,
  decimal = false,
  toDisplay = (stored) => stored,
  fromDisplay = (shown) => shown,
}: Props) {
  const shown = value === null ? null : toDisplay(value);
  const [text, setText] = useState(formatNumber(shown));
  const [error, setError] = useState<string | null>(null);

  // The value changed from outside (duplicate, undo): show it.
  useEffect(() => {
    setText((current) => {
      const typed = current.trim() === "" ? null : parseNumber(current);
      return typed === shown ? current : formatNumber(shown);
    });
    setError(null);
  }, [shown]);

  function report(next: string | null) {
    setError(next);
    onErrorChange?.(next);
  }

  function handleText(next: string) {
    setText(next);
    if (next.trim() === "") {
      report(null);
      onChange(null);
      return;
    }
    const parsed = parseNumber(next);
    if (Number.isNaN(parsed)) {
      report("Entre un nombre.");
      return;
    }
    const stored = Math.round(fromDisplay(parsed) * 1000) / 1000;
    const message = validate(stored);
    report(message);
    if (message === null) {
      onChange(stored);
    }
  }

  function nudge(direction: 1 | -1) {
    const base = shown ?? 0;
    const next = Math.min(max, Math.max(min, base + direction * step));
    const rounded = Math.round(next * 1000) / 1000;
    setText(formatNumber(rounded));
    report(null);
    onChange(Math.round(fromDisplay(rounded) * 1000) / 1000);
  }

  const errorId = `${id}-error`;
  const buttonClasses =
    "flex size-tap shrink-0 items-center justify-center rounded-btn border border-base-300 bg-base-100 text-xl font-bold text-secondary";

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-overline uppercase text-accent">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label={`Diminuer ${label}`}
          className={buttonClasses}
        >
          −
        </button>
        <input
          id={id}
          type="text"
          inputMode={decimal ? "decimal" : "numeric"}
          autoComplete="off"
          value={text}
          onChange={(event) => handleText(event.target.value)}
          placeholder="—"
          aria-invalid={error === null ? undefined : true}
          aria-describedby={error === null ? undefined : errorId}
          className={`h-field w-full min-w-0 rounded-btn border bg-base-100 text-center font-display text-display-sm ${
            error === null
              ? "border-base-300"
              : "border-[1.5px] border-status-missed"
          }`}
        />
        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label={`Augmenter ${label}`}
          className={buttonClasses}
        >
          +
        </button>
      </div>
      {error !== null && (
        <p
          id={errorId}
          className="flex items-start gap-1 text-sm font-semibold"
        >
          <span aria-hidden="true" className="text-status-missed">
            ⚠
          </span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export default NumberField;
