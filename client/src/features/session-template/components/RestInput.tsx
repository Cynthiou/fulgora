import { formatDuration, SET_LIMITS } from "shared";

type Props = {
  id: string;
  label: string;
  // Seconds; null = no rest planned
  value: number | null;
  onChange: (value: number | null) => void;
};

const STEP = 15;

// "Repos par défaut · − 1 min 30 +": a rest set 15 seconds at a time, from
// 0 to 10 minutes (RM-023).
function RestInput({ id, label, value, onChange }: Props) {
  const { max } = SET_LIMITS.rest_after_seconds;

  function nudge(direction: 1 | -1) {
    onChange(Math.min(max, Math.max(0, (value ?? 0) + direction * STEP)));
  }

  const buttonClasses =
    "flex size-tap shrink-0 items-center justify-center rounded-btn border border-base-300 bg-base-100 text-xl font-bold text-secondary";

  return (
    <fieldset
      id={id}
      className="flex items-center justify-between gap-3 rounded-card border border-base-300 bg-base-100 p-3 shadow-card"
    >
      <legend className="float-left font-semibold">{label}</legend>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label={`Diminuer ${label}`}
          className={buttonClasses}
        >
          −
        </button>
        <span aria-live="polite" className="min-w-16 text-center font-semibold">
          {value === null ? "Aucun" : formatDuration(value)}
        </span>
        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label={`Augmenter ${label}`}
          className={buttonClasses}
        >
          +
        </button>
      </div>
    </fieldset>
  );
}

export default RestInput;
