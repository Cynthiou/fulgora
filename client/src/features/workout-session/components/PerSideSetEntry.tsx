import { useState } from "react";
import {
  describeSet,
  formatSetValues,
  getSetLabel,
  getSide,
  type MeasureCode,
  type MeasureProfile,
  SIDE_LABELS,
  SIDES,
  type SideCode,
  type SideSetValues,
  toPlannedValues,
  type WorkoutSetRow,
} from "shared";
import checkIcon from "../../../assets/icons/ui/app/check.svg";
import pencilIcon from "../../../assets/icons/ui/app/pencil.svg";
import Icon from "../../../components/Icon";
import DurationTimer from "./DurationTimer";

type Props = {
  set: WorkoutSetRow;
  index: number;
  total: number;
  profile: MeasureProfile;
  measureCodes: MeasureCode[];
  isBodyweight: boolean;
  isPending: boolean;
  // Records one side as it was planned
  onValidateSide: (side: SideCode, values: SideSetValues) => void;
  // Opens the fields of one side (B5g)
  onEditSide: (side: SideCode) => void;
};

// What one side was planned to do: the goal is the same on both sides, only
// the load may differ (US-51, D-02).
function plannedForSide(set: WorkoutSetRow, side: SideCode): SideSetValues {
  const load =
    side === "left" ? set.weight_left_planned_kg : set.weight_right_planned_kg;
  return {
    reps: set.reps_planned,
    weight_kg: load ?? set.weight_planned_kg,
    duration_seconds: set.duration_planned_seconds,
  };
}

// Screens B5g and B5h: the set of a per-side exercise. Left and right are
// recorded one after the other; the set is done only once both are there
// (US-51, RM-044).
function PerSideSetEntry({
  set,
  index,
  total,
  profile,
  measureCodes,
  isBodyweight,
  isPending,
  onValidateSide,
  onEditSide,
}: Props) {
  const [isCounting, setIsCounting] = useState(false);
  const label = getSetLabel(profile, index);
  // The side to do now: the left one first, then the right one (B5h).
  const current: SideCode = getSide(set, "left") === null ? "left" : "right";
  const isDuration = profile === "duration";

  function describeSide(side: SideCode): string {
    const done = getSide(set, side);
    if (done !== null) {
      return formatSetValues(
        {
          reps: done.reps_actual,
          reps_left: null,
          reps_right: null,
          weight_kg: done.weight_actual_kg,
          weight_left_kg: null,
          weight_right_kg: null,
          duration_seconds: done.duration_actual_seconds,
          distance_meters: null,
          speed_kmh: null,
          resistance: null,
          incline_percent: null,
          calories: null,
          rest_after_seconds: null,
        },
        measureCodes,
        isBodyweight,
      );
    }
    const planned = plannedForSide(set, side);
    const parts = describeSet(
      {
        ...toPlannedValues(set),
        reps: planned.reps,
        weight_kg: planned.weight_kg,
        reps_left: null,
        reps_right: null,
        weight_left_kg: null,
        weight_right_kg: null,
        duration_seconds: planned.duration_seconds,
      },
      measureCodes,
      isBodyweight,
    );
    return parts.length === 0 ? "rien de prévu" : parts.join(" · ");
  }

  return (
    <li className="flex flex-col gap-2.5">
      <div
        className={`flex flex-col gap-3 rounded-hero border-[1.5px] p-4 ${
          isCounting
            ? "border-pick bg-pick text-pick-content"
            : "border-primary bg-base-100 shadow-set"
        }`}
      >
        <div className="flex w-full items-center justify-between gap-2">
          <p
            className={`font-sans text-overline uppercase not-italic ${
              isCounting ? "text-primary" : "text-action-text"
            }`}
          >
            {isDuration
              ? `${label} · côté ${SIDE_LABELS[current].toLocaleLowerCase("fr-FR")}`
              : `${label} / ${total}`}
          </p>
          <button
            type="button"
            onClick={() => onEditSide(current)}
            disabled={isPending}
            aria-label={`Modifier le côté ${SIDE_LABELS[current].toLocaleLowerCase("fr-FR")} de la série ${index + 1}`}
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

        {isDuration ? (
          <>
            {/* B5h: the side already done stays written above the timer. */}
            <p className="text-sm font-semibold">
              {getSide(set, "left") === null
                ? "Gauche : à faire"
                : `Gauche : ${describeSide("left")} ✓`}
            </p>
            <DurationTimer
              plannedSeconds={set.duration_planned_seconds}
              isPending={isPending}
              onDone={(seconds) =>
                onValidateSide(current, {
                  ...plannedForSide(set, current),
                  duration_seconds: seconds,
                })
              }
              onRunningChange={setIsCounting}
            />
          </>
        ) : (
          // B5g: the two sides, side by side, each with its own values.
          <div className="grid grid-cols-2 gap-2.5">
            {SIDES.map((side) => {
              const done = getSide(set, side);
              return (
                <div
                  key={side}
                  className={`flex flex-col gap-2 rounded-card border p-3 ${
                    done === null
                      ? "border-base-300"
                      : "border-status-done bg-status-done/5"
                  }`}
                >
                  <p className="font-sans text-overline uppercase not-italic text-muted">
                    {SIDE_LABELS[side]}
                  </p>
                  <p className="text-sm font-extrabold">{describeSide(side)}</p>
                  {done === null ? (
                    <button
                      type="button"
                      onClick={() =>
                        onValidateSide(side, plannedForSide(set, side))
                      }
                      disabled={isPending}
                      className="flex h-11 items-center justify-center gap-2 rounded-btn bg-primary text-[13px] font-extrabold uppercase text-primary-content disabled:opacity-60"
                    >
                      <Icon src={checkIcon} className="size-4" />
                      Valider
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onEditSide(side)}
                      disabled={isPending}
                      className="flex h-11 items-center justify-center gap-2 rounded-btn border border-base-300 text-[13px] font-bold disabled:opacity-60"
                    >
                      <Icon src={pencilIcon} className="size-4" />
                      Modifier
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </li>
  );
}

export default PerSideSetEntry;
