import { useState } from "react";
import {
  type ActualSetValues,
  getMeasureProfile,
  getSetFieldDisplay,
  getSetFieldLabel,
  getSetFieldStepper,
  getSetFields,
  getSetLabel,
  getSpeedUnitLabel,
  isEmptySet,
  type MeasureCode,
  plannedAsActual,
  SET_LIMITS,
  type SetValueField,
  validateSetValue,
  type WorkoutSetRow,
} from "shared";
import checkIcon from "../../../assets/icons/ui/app/check.svg";
import BottomSheet from "../../../components/BottomSheet";
import Icon from "../../../components/Icon";
import MinSecField from "../../../components/MinSecField";
import NumberField from "../../../components/NumberField";

type Props = {
  set: WorkoutSetRow;
  // Position of the set in its exercise, from 0
  index: number;
  measureCodes: MeasureCode[];
  isBodyweight: boolean;
  // The time measured by the stopwatch, which fills the duration (B5f)
  measuredSeconds?: number | null;
  onConfirm: (values: ActualSetValues) => void;
  onCancel: () => void;
};

// Cardio readings are averages read on the machine (B5f).
function fieldLabel(
  field: SetValueField,
  isCardio: boolean,
  profile: ReturnType<typeof getMeasureProfile>,
) {
  if (isCardio && field === "speed_kmh") {
    return `Vitesse moy. (${getSpeedUnitLabel()})`;
  }
  if (isCardio && field === "incline_percent") {
    return "Inclinaison moy. (%)";
  }
  return getSetFieldLabel(field, profile);
}

function formatPlanned(field: SetValueField, value: number | null): string {
  if (value === null) {
    return "—";
  }
  const format = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
  if (field === "duration_seconds") {
    const minutes = Math.floor(value / 60);
    return `${minutes}:${String(value % 60).padStart(2, "0")}`;
  }
  // The plan is written in the unit of the screen, like the field (US-05)
  const display = getSetFieldDisplay(field);
  return format.format(display === null ? value : display.toDisplay(value));
}

// Screens B3b and B5f: "Ce que tu as réellement fait". The fields start from
// the plan (or from what was already recorded); − / + and free typing; the
// plan is written next to each field. "Valider" records the set.
function ActualSetSheet({
  set,
  index,
  measureCodes,
  isBodyweight,
  measuredSeconds = null,
  onConfirm,
  onCancel,
}: Props) {
  const profile = getMeasureProfile(measureCodes, isBodyweight);
  const isCardio = profile === "cardio";
  // Only the fields a result can hold: the two per-side loads are
  // planned, never recorded (US-51).
  const fields = getSetFields(measureCodes, isBodyweight).filter(
    (field): field is keyof ActualSetValues =>
      field !== "weight_left_kg" && field !== "weight_right_kg",
  );
  const planned = plannedAsActual(set);
  const [values, setValues] = useState<ActualSetValues>(() => {
    const start =
      set.validated_at === null
        ? planned
        : {
            reps: set.reps_actual,
            weight_kg: set.weight_actual_kg,
            weight_left_kg: null,
            weight_right_kg: null,
            duration_seconds: set.duration_actual_seconds,
            distance_meters: set.distance_actual_meters,
            speed_kmh: set.speed_actual_kmh,
            resistance: set.resistance_actual,
            incline_percent: set.incline_actual_percent,
            calories: set.calories_actual,
          };
    // The stopwatch of the stage fills the duration (B5f, US-49).
    return measuredSeconds === null
      ? start
      : { ...start, duration_seconds: measuredSeconds };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);
  const label = getSetLabel(profile, index);

  function setError(field: string, message: string | null) {
    setErrors((current) => {
      if (message === null) {
        const { [field]: _gone, ...rest } = current;
        return rest;
      }
      return { ...current, [field]: message };
    });
  }

  function confirm() {
    if (isEmptySet(values)) {
      setEmptyMessage("Indique au moins une valeur pour valider la série.");
      return;
    }
    onConfirm(values);
  }

  const hasError = Object.keys(errors).length > 0;

  return (
    <BottomSheet
      label="Ce que tu as réellement fait"
      onClose={onCancel}
      closeLabel={null}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2
            id="actual-set-title"
            className="font-sans text-overline uppercase not-italic text-accent"
          >
            Ce que tu as réellement fait
          </h2>
          <p className="font-display text-[26px] font-extrabold uppercase italic leading-none">
            {label}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-tap shrink-0 px-1 text-sm font-semibold text-secondary"
        >
          Annuler
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {fields.map((field) => {
          const title = fieldLabel(field, isCardio, profile);
          const hint = `${title} · prévu ${formatPlanned(field, planned[field])}`;
          if (field === "duration_seconds") {
            return (
              <MinSecField
                key={field}
                id={`actual-${field}`}
                label={hint}
                labelTone="muted"
                value={values.duration_seconds}
                max={SET_LIMITS.duration_seconds.max}
                onChange={(value) => {
                  setEmptyMessage(null);
                  setValues((current) => ({
                    ...current,
                    duration_seconds: value,
                  }));
                }}
                validate={(value) => validateSetValue(field, value)}
                onErrorChange={(message) => setError(field, message)}
              />
            );
          }
          const stepper = getSetFieldStepper(field);
          const display = getSetFieldDisplay(field);
          return (
            <NumberField
              key={field}
              id={`actual-${field}`}
              label={hint}
              labelTone="muted"
              value={values[field]}
              step={stepper.step}
              decimal={stepper.decimal}
              grid={stepper.grid}
              min={SET_LIMITS[field].min}
              max={SET_LIMITS[field].max}
              toDisplay={display?.toDisplay}
              fromDisplay={display?.fromDisplay}
              onChange={(value) => {
                setEmptyMessage(null);
                setValues((current) => ({ ...current, [field]: value }));
              }}
              validate={(value) => validateSetValue(field, value)}
              onErrorChange={(message) => setError(field, message)}
            />
          );
        })}
      </div>

      {emptyMessage !== null && (
        <p role="alert" className="flex gap-1 text-sm font-semibold">
          <span aria-hidden="true" className="text-status-missed">
            ⚠
          </span>
          {emptyMessage}
        </p>
      )}

      <button
        type="button"
        onClick={confirm}
        disabled={hasError}
        className="flex h-btn w-full items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60"
      >
        <Icon src={checkIcon} className="size-[18px]" />
        Valider {isCardio ? "l'étape" : "la série"} {index + 1}
      </button>
    </BottomSheet>
  );
}

export default ActualSetSheet;
