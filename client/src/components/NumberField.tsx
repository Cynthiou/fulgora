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
  // The label is teal in a form (A2), grey inside a set card (A7a)
  labelTone?: "accent" | "muted";
  // Unit shown on screen when it differs from the stored one (km for meters)
  toDisplay?: (stored: number) => number;
  fromDisplay?: (shown: number) => number;
  // Values the field may hold, in the unit shown: 0,25 for a load in
  // kilograms, 0,5 for a load in pounds (US-15, US-05)
  grid?: number;
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
  labelTone = "accent",
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
  grid,
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

  // The step is in the shown unit (2,5 kg, 5 lb, 0,1 km), the limits are in
  // the stored one: the value is clamped once converted back (DT-11).
  function nudge(direction: 1 | -1) {
    const base = shown ?? 0;
    const raw = base + direction * step;
    // A load lands on a value the field accepts: 132,277 lb + 5 = 137,5.
    const aligned = grid === undefined ? raw : Math.round(raw / grid) * grid;
    const target = fromDisplay(aligned);
    const stored = Math.min(
      max,
      Math.max(min, Math.round(target * 1000) / 1000),
    );
    setText(formatNumber(Math.round(toDisplay(stored) * 1000) / 1000));
    report(null);
    onChange(stored);
  }

  const errorId = `${id}-error`;
  // The stepper of the mockups (A7a): one box of 52 px, the − and the + in
  // their own 44 px column, separated by a thin line.
  const stepClasses =
    "grid h-full place-items-center text-xl font-semibold text-base-content";

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={
          labelTone === "muted"
            ? "text-[10px] font-bold uppercase tracking-[0.14em] text-muted"
            : "font-sans text-overline uppercase not-italic text-accent"
        }
      >
        {label}
      </label>
      <div
        className={`grid h-13 grid-cols-[44px_1fr_44px] items-center overflow-hidden rounded-btn border bg-base-100 shadow-card ${
          error === null
            ? "border-base-300"
            : "border-[1.5px] border-status-missed"
        }`}
      >
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label={`Diminuer ${label}`}
          className={`${stepClasses} border-r border-base-300`}
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
          className="h-full w-full min-w-0 bg-transparent text-center text-lg font-extrabold"
        />
        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label={`Augmenter ${label}`}
          className={`${stepClasses} border-l border-base-300`}
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
