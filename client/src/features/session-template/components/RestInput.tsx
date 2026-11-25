import { formatDuration, SET_LIMITS } from "shared";
import stopwatchIcon from "../../../assets/icons/ui/app/stopwatch.svg";
import Icon from "../../../components/Icon";

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

  // The mockup draws small squares of 28 px; the button around them keeps
  // the 44 px of a comfortable target (A7a).
  const buttonClasses =
    "grid size-tap shrink-0 place-items-center text-xl font-semibold";
  const squareClasses = "grid size-7 place-items-center rounded-ctl bg-soft";

  return (
    <fieldset
      id={id}
      className="flex items-center justify-between gap-2 rounded-card border border-base-300 bg-base-100 py-1 pr-2 pl-3.5 shadow-card"
    >
      <legend className="float-left flex items-center gap-2 text-sm font-semibold">
        <Icon src={stopwatchIcon} className="size-[18px] text-secondary" />
        {label}
      </legend>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label={`Diminuer ${label}`}
          className={buttonClasses}
        >
          <span aria-hidden="true" className={squareClasses}>
            −
          </span>
        </button>
        <span
          aria-live="polite"
          className="min-w-16 text-center text-sm font-extrabold"
        >
          {value === null ? "Aucun" : formatDuration(value)}
        </span>
        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label={`Augmenter ${label}`}
          className={buttonClasses}
        >
          <span aria-hidden="true" className={squareClasses}>
            +
          </span>
        </button>
      </div>
    </fieldset>
  );
}

export default RestInput;
