import {
  describeSet,
  formatActualValues,
  formatSetValues,
  getSetLabel,
  type MeasureCode,
  type MeasureProfile,
  toPlannedValues,
  type WorkoutSetRow,
} from "shared";
import pencilIcon from "../../../assets/icons/ui/actions/pencil.svg";
import trashIcon from "../../../assets/icons/ui/actions/trash.svg";
import chevronRightIcon from "../../../assets/icons/ui/chevrons/chevron-right.svg";
import Icon from "../../../components/Icon";

type Props = {
  set: WorkoutSetRow;
  index: number;
  profile: MeasureProfile;
  measureCodes: MeasureCode[];
  isBodyweight: boolean;
  // "active": the set to do now, with its big planned values
  state: "done" | "active" | "upcoming";
  isPending: boolean;
  onValidate: () => void;
  onEdit: () => void;
  onPick: () => void;
};

// Screen B3a: one set of the exercise.
// Done: a compact grey line "✓ Série 1 · 10 rép. · 40 kg ›".
// Active: the planned values in big cells, "Valider la série 2", a pencil.
// Upcoming: "Série 3 · prévu 10 rép. · 40 kg", "Faire" and a trash can.
function SetRow({
  set,
  index,
  profile,
  measureCodes,
  isBodyweight,
  state,
  isPending,
  onValidate,
  onEdit,
  onPick,
}: Props) {
  const label = getSetLabel(profile, index);
  const isCardio = profile === "cardio";
  const noun = isCardio ? "l'étape" : "la série";

  if (state === "done") {
    return (
      <li>
        <button
          type="button"
          onClick={onEdit}
          className="flex w-full items-center gap-2 rounded-card border border-base-300 bg-soft p-3 text-left"
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 font-semibold">
            <span aria-hidden="true" className="text-status-done">
              ✓
            </span>
            {label}
            <span className="sr-only">validée, corriger</span>
          </span>
          <span className="shrink-0 text-sm text-muted">
            {formatActualValues(set, measureCodes, isBodyweight)}
          </span>
          <Icon src={chevronRightIcon} className="size-5 shrink-0 text-muted" />
        </button>
      </li>
    );
  }

  if (state === "active") {
    const parts = describeSet(toPlannedValues(set), measureCodes, isBodyweight);
    return (
      <li className="flex flex-col gap-4 rounded-card border-2 border-primary bg-base-100 p-4 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <p className="text-overline uppercase text-accent">{label}</p>
          <button
            type="button"
            onClick={onEdit}
            disabled={isPending}
            aria-label={`Modifier ${noun} ${index + 1}`}
            className="flex size-tap items-center justify-center rounded-btn text-secondary disabled:opacity-60"
          >
            <Icon src={pencilIcon} className="size-5" />
          </button>
        </div>

        {parts.length === 0 ? (
          <p className="text-muted">
            Aucun objectif prévu : indique ce que tu as fait.
          </p>
        ) : (
          // The planned values, read only, one cell each (B3a)
          <ul
            className={`grid divide-x divide-base-300 overflow-hidden rounded-card border border-base-300 ${
              parts.length > 2 ? "grid-cols-3" : "grid-cols-2"
            }`}
          >
            {parts.map((part) => {
              const [value, ...unit] = part.split(" ");
              return (
                <li key={part} className="flex flex-col items-center py-3">
                  <span className="font-display text-display-lg leading-none">
                    {value}
                  </span>
                  <span className="text-sm text-muted">{unit.join(" ")}</span>
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          onClick={isCardio || parts.length === 0 ? onEdit : onValidate}
          disabled={isPending}
          className="flex h-btn w-full items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action disabled:opacity-60"
        >
          Valider {noun} {index + 1}
        </button>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded-card border border-base-300 bg-base-100 p-3 shadow-card">
      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
        <span className="font-semibold">{label}</span>
        <span className="text-sm text-muted">
          prévu{" "}
          {formatSetValues(
            toPlannedValues(set),
            measureCodes,
            isBodyweight,
          ).toLowerCase()}
        </span>
      </span>
      <button
        type="button"
        onClick={onPick}
        aria-label={`Faire ${noun} ${index + 1}`}
        className="min-h-tap shrink-0 rounded-btn border border-base-300 bg-base-100 px-4 font-semibold"
      >
        Faire
      </button>
      {/* Removing a set that was not done arrives with US-32. */}
      <span
        aria-hidden="true"
        title="Retirer une série arrive bientôt"
        className="flex size-tap shrink-0 items-center justify-center text-faint"
      >
        <Icon src={trashIcon} className="size-5" />
      </span>
    </li>
  );
}

export default SetRow;
