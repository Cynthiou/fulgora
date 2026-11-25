import { useState } from "react";
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
import checkIcon from "../../../assets/icons/ui/app/check.svg";
import pencilIcon from "../../../assets/icons/ui/app/pencil.svg";
import trashIcon from "../../../assets/icons/ui/app/trash.svg";
import Icon from "../../../components/Icon";
import CardioStepTimer from "./CardioStepTimer";
import DurationTimer from "./DurationTimer";

type Props = {
  set: WorkoutSetRow;
  index: number;
  // How many sets the exercise holds, for "Série 2 / 3"
  total: number;
  profile: MeasureProfile;
  measureCodes: MeasureCode[];
  isBodyweight: boolean;
  // "active": the set to do now, with its big planned values
  state: "done" | "active" | "upcoming";
  isPending: boolean;
  onValidate: () => void;
  onEdit: () => void;
  onPick: () => void;
  // Only a set added during the session can be removed (RM-048)
  onRemove: (() => void) | null;
  // The time measured by the app (US-49): the set is validated with it for
  // an exercise in time, and it opens the machine reading for a cardio one.
  onTimed: (seconds: number) => void;
};

// Screen B3a: one set of the exercise.
// Done: a white line with a green check, "Série 1 · 10 rép. · 40 kg".
// Active: the planned values in big slanted numbers, "Valider la série 2".
// Upcoming: "Série 3 · prévu 10 rép. · 40 kg" and "Faire".
function SetRow({
  set,
  index,
  total,
  profile,
  measureCodes,
  isBodyweight,
  state,
  isPending,
  onValidate,
  onEdit,
  onPick,
  onRemove,
  onTimed,
}: Props) {
  const label = getSetLabel(profile, index);
  const isCardio = profile === "cardio";
  const noun = isCardio ? "l'étape" : "la série";
  // While the app counts the time, the card turns dark (B5c, B5e).
  const [isCounting, setIsCounting] = useState(false);

  if (state === "done") {
    return (
      <li>
        <button
          type="button"
          onClick={onEdit}
          className="flex w-full items-center gap-2.5 rounded-card border border-base-300 bg-base-100 px-3.5 py-2.5 text-left shadow-card"
        >
          <span
            aria-hidden="true"
            className="grid size-[22px] shrink-0 place-items-center rounded-full bg-status-done text-white"
          >
            <Icon src={checkIcon} className="size-3" />
          </span>
          <b className="min-w-0 flex-1 truncate text-[13px] font-bold">
            {label}
            <span className="sr-only">validée, corriger</span>
          </b>
          <span className="shrink-0 text-[12.5px] font-medium leading-[1.45] text-muted">
            {formatActualValues(set, measureCodes, isBodyweight)}
          </span>
        </button>
      </li>
    );
  }

  if (state === "active") {
    const parts = describeSet(toPlannedValues(set), measureCodes, isBodyweight);
    return (
      <li className="flex flex-col gap-2.5">
        <div
          className={`flex flex-col items-center gap-3 rounded-hero border-[1.5px] p-4 ${
            isCounting
              ? "border-pick bg-pick text-pick-content"
              : "border-primary bg-base-100 shadow-set"
          }`}
        >
          <div className="flex w-full items-center justify-between gap-2">
            <p
              className={`flex items-center gap-2 font-sans text-overline uppercase not-italic ${
                isCounting ? "text-primary" : "text-action-text"
              }`}
            >
              {label} / {total}
              {set.is_added && (
                <span className="rounded-chip border border-base-300 px-2 py-0.5 text-base-content">
                  Ajoutée
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={onEdit}
              disabled={isPending}
              aria-label={`Modifier ${noun} ${index + 1}`}
              className="-m-[5px] grid size-tap place-items-center disabled:opacity-60"
            >
              <span
                aria-hidden="true"
                className={`grid size-[34px] place-items-center rounded-btn ${
                  isCounting ? "bg-pick-content/10" : "bg-soft"
                }`}
              >
                <Icon src={pencilIcon} className="size-4" />
              </span>
            </button>
          </div>

          {/* An exercise in time shows its objective inside the timer. */}
          {profile === "duration" ? null : parts.length === 0 ? (
            <p className="text-sm text-muted">
              Aucun objectif prévu : indique ce que tu as fait.
            </p>
          ) : (
            // The planned values, read only, in big numbers (B3a)
            <ul className="flex flex-wrap items-baseline justify-center gap-2.5">
              {parts.map((part, position) => {
                const [value, ...unit] = part.split(" ");
                return (
                  <li key={part} className="flex items-baseline gap-2.5">
                    <span
                      className={`font-display text-[72px] font-extrabold uppercase italic leading-none ${
                        position === 0 ? "" : "text-secondary"
                      }`}
                    >
                      {value}
                    </span>
                    <span className="text-[13px] font-semibold leading-[1.45] text-muted">
                      {unit.join(" ")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {profile === "duration" ? (
            // B5b and B5c: the app counts the time of the set (US-49)
            <DurationTimer
              plannedSeconds={set.duration_planned_seconds}
              isPending={isPending}
              onDone={onTimed}
              onRunningChange={setIsCounting}
            />
          ) : isCardio ? (
            // B5d and B5e: the stage is launched, then the reading (US-49)
            <CardioStepTimer
              plannedSeconds={set.duration_planned_seconds}
              stageLabel={label}
              isPending={isPending}
              onStop={onTimed}
              onRunningChange={setIsCounting}
            />
          ) : null}
        </div>

        {/* The mockup puts the orange button right under the card (B3a). */}
        {profile !== "duration" && !isCardio && (
          <button
            type="button"
            onClick={parts.length === 0 ? onEdit : onValidate}
            disabled={isPending}
            className="flex h-btn w-full items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60"
          >
            <Icon src={checkIcon} className="size-[18px]" />
            Valider {noun} {index + 1}
          </button>
        )}
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2.5 rounded-card border border-base-300 bg-base-100/55 px-3.5 py-2.5">
      <b className="shrink-0 text-[13px] font-bold">{label}</b>
      {set.is_added && (
        <span className="shrink-0 rounded-chip border border-base-300 px-2 text-overline uppercase">
          Ajoutée
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-xs font-medium leading-[1.45] text-muted">
        ·{" "}
        {`prévu ${formatSetValues(
          toPlannedValues(set),
          measureCodes,
          isBodyweight,
        ).toLowerCase()}`}
      </span>
      <button
        type="button"
        onClick={onPick}
        aria-label={`Faire ${noun} ${index + 1}`}
        className="min-h-tap shrink-0 px-1 text-[13px] font-semibold text-secondary"
      >
        Faire
      </button>
      {/* Only a set added during the session goes away (RM-048). */}
      {onRemove !== null && (
        <button
          type="button"
          onClick={onRemove}
          disabled={isPending}
          aria-label={`Retirer ${noun} ${index + 1}`}
          className="grid size-tap shrink-0 place-items-center text-status-missed disabled:opacity-60"
        >
          <Icon src={trashIcon} className="size-[18px]" />
        </button>
      )}
    </li>
  );
}

export default SetRow;
