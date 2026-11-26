import { useEffect, useState } from "react";
import { type BareDurationUnit, formatMinSec, parseMinSec } from "shared";

type Props = {
  id: string;
  label: string;
  // Seconds; null = no objective
  value: number | null;
  onChange: (value: number | null) => void;
  validate: (value: number | null) => string | null;
  onErrorChange?: (error: string | null) => void;
  // The label is teal in a form (A2), grey inside a set card (A7a)
  labelTone?: "accent" | "muted";
  // Seconds added or removed by − and +
  step?: number;
  // What a plain number means: seconds, or minutes in cardio (RM-083)
  bareUnit?: BareDurationUnit;
  // The example shown in the empty field
  placeholder?: string;
  max: number;
};

const FORMAT_MESSAGE = "Entre une durée en min:s, par exemple 1:30.";

// A duration typed as "1:30", with − and + buttons (15 s by default).
function MinSecField({
  id,
  label,
  labelTone = "accent",
  value,
  onChange,
  validate,
  onErrorChange,
  step = 15,
  bareUnit = "seconds",
  placeholder = "—",
  max,
}: Props) {
  const [text, setText] = useState(value === null ? "" : formatMinSec(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText((current) =>
      (current.trim() === "" ? null : parseMinSec(current, bareUnit)) === value
        ? current
        : value === null
          ? ""
          : formatMinSec(value),
    );
    setError(null);
  }, [value, bareUnit]);

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
    const seconds = parseMinSec(next, bareUnit);
    if (seconds === null) {
      report(FORMAT_MESSAGE);
      return;
    }
    const message = validate(seconds);
    report(message);
    if (message === null) {
      onChange(seconds);
    }
  }

  function nudge(direction: 1 | -1) {
    const next = Math.min(max, Math.max(0, (value ?? 0) + direction * step));
    setText(formatMinSec(next));
    report(null);
    onChange(next);
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
          inputMode="numeric"
          autoComplete="off"
          value={text}
          onChange={(event) => handleText(event.target.value)}
          placeholder={placeholder}
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

export default MinSecField;
