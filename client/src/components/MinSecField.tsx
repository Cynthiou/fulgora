import { useEffect, useState } from "react";
import { formatMinSec, parseMinSec } from "shared";

type Props = {
  id: string;
  label: string;
  // Seconds; null = no objective
  value: number | null;
  onChange: (value: number | null) => void;
  validate: (value: number | null) => string | null;
  onErrorChange?: (error: string | null) => void;
  // Seconds added or removed by − and +
  step?: number;
  max: number;
};

const FORMAT_MESSAGE = "Entre une durée en min:s, par exemple 1:30.";

// A duration typed as "1:30", with − and + buttons (15 s by default).
function MinSecField({
  id,
  label,
  value,
  onChange,
  validate,
  onErrorChange,
  step = 15,
  max,
}: Props) {
  const [text, setText] = useState(value === null ? "" : formatMinSec(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText((current) =>
      (current.trim() === "" ? null : parseMinSec(current)) === value
        ? current
        : value === null
          ? ""
          : formatMinSec(value),
    );
    setError(null);
  }, [value]);

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
    const seconds = parseMinSec(next);
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
          inputMode="numeric"
          autoComplete="off"
          value={text}
          onChange={(event) => handleText(event.target.value)}
          placeholder="—"
          aria-invalid={error === null ? undefined : true}
          aria-describedby={error === null ? undefined : errorId}
          className={`h-field w-full min-w-0 rounded-btn border bg-base-100 text-center font-semibold ${
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

export default MinSecField;
