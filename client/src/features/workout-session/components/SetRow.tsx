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

// Screen B3a: one set of the exercise. Done: "✓ Série 1 · 10 rép. · 40 kg".
// Active: the plan in big, "Valider la série 2" and "Modifier". Upcoming:
// "Série 3 · prévu 10 rép. · 40 kg" and "Faire".
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
          className="flex w-full items-center justify-between gap-2 rounded-card border border-base-300 bg-base-100 p-4 text-left shadow-card"
        >
          <span className="flex min-w-0 flex-col">
            <span className="font-semibold">
              <span aria-hidden="true" className="text-status-done">
                ✓{" "}
              </span>
              {label}
              <span className="sr-only"> validée</span>
            </span>
            <span className="text-sm text-muted">
              {formatActualValues(set, measureCodes, isBodyweight)}
            </span>
          </span>
          <span className="text-sm font-semibold text-secondary">Corriger</span>
        </button>
      </li>
    );
  }

  if (state === "active") {
    const parts = describeSet(toPlannedValues(set), measureCodes, isBodyweight);
    return (
      <li className="flex flex-col gap-4 rounded-card border-2 border-primary bg-base-100 p-4 shadow-card">
        <p className="text-overline uppercase text-primary">{label}</p>
        {parts.length === 0 ? (
          <p className="text-muted">
            Aucun objectif prévu : indique ce que tu as fait.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-6">
            {parts.map((part) => {
              const [value, ...unit] = part.split(" ");
              return (
                <li key={part} className="flex flex-col">
                  <span className="font-display text-display-lg leading-none">
                    {value}
                  </span>
                  <span className="text-sm text-muted">{unit.join(" ")}</span>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={isCardio || parts.length === 0 ? onEdit : onValidate}
            disabled={isPending}
            className="flex h-btn w-full items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action disabled:opacity-60"
          >
            Valider {noun} {index + 1}
          </button>
          {!isCardio && parts.length > 0 && (
            <button
              type="button"
              onClick={onEdit}
              disabled={isPending}
              className="min-h-tap font-semibold text-secondary"
            >
              Modifier
            </button>
          )}
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card">
      <span className="flex min-w-0 flex-col">
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
    </li>
  );
}

export default SetRow;
