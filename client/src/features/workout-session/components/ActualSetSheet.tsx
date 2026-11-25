import { useEffect, useRef, useState } from "react";
import {
  type ActualSetValues,
  getMeasureProfile,
  getSetFieldLabel,
  getSetFields,
  getSetLabel,
  isEmptySet,
  type MeasureCode,
  plannedAsActual,
  SET_LIMITS,
  type SetValueField,
  validateSetValue,
  type WorkoutSetRow,
} from "shared";
import MinSecField from "../../../components/MinSecField";
import NumberField from "../../../components/NumberField";

type Props = {
  set: WorkoutSetRow;
  // Position of the set in its exercise, from 0
  index: number;
  measureCodes: MeasureCode[];
  isBodyweight: boolean;
  onConfirm: (values: ActualSetValues) => void;
  onCancel: () => void;
};

// What − and + add on each field (the validation step can be finer: 0.25 kg).
const STEPPER: Record<SetValueField, { step: number; decimal: boolean }> = {
  reps: { step: 1, decimal: false },
  weight_kg: { step: 2.5, decimal: true },
  duration_seconds: { step: 15, decimal: false },
  distance_meters: { step: 100, decimal: true },
  speed_kmh: { step: 0.5, decimal: true },
  incline_percent: { step: 0.5, decimal: true },
  resistance: { step: 1, decimal: false },
  calories: { step: 10, decimal: false },
};

// Cardio readings are averages read on the machine (B5f).
function fieldLabel(
  field: SetValueField,
  isCardio: boolean,
  profile: ReturnType<typeof getMeasureProfile>,
) {
  if (isCardio && field === "speed_kmh") {
    return "Vitesse moy. (km/h)";
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
  if (field === "distance_meters") {
    return format.format(value / 1000);
  }
  return format.format(value);
}

// Screens B3b and B5f: "Ce que tu as réellement fait". The fields start from
// the plan (or from what was already recorded); − / + and free typing; the
// plan is written next to each field. "Valider" records the set.
function ActualSetSheet({
  set,
  index,
  measureCodes,
  isBodyweight,
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const profile = getMeasureProfile(measureCodes, isBodyweight);
  const isCardio = profile === "cardio";
  const fields = getSetFields(measureCodes, isBodyweight);
  const planned = plannedAsActual(set);
  const [values, setValues] = useState<ActualSetValues>(() =>
    set.validated_at === null
      ? planned
      : {
          reps: set.reps_actual,
          weight_kg: set.weight_actual_kg,
          duration_seconds: set.duration_actual_seconds,
          distance_meters: set.distance_actual_meters,
          speed_kmh: set.speed_actual_kmh,
          resistance: set.resistance_actual,
          incline_percent: set.incline_actual_percent,
          calories: set.calories_actual,
        },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);
  const label = getSetLabel(profile, index);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null || dialog.open) {
      return;
    }
    const opener = document.activeElement;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus();
      }
    };
  }, []);

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
    <dialog
      ref={dialogRef}
      aria-labelledby="actual-set-title"
      onClose={onCancel}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-hero border border-base-300 bg-base-100 p-4 text-base-content shadow-card backdrop:bg-neutral/60"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <h2 id="actual-set-title" className="text-display-sm">
            Ce que tu as réellement fait
          </h2>
          <p className="font-semibold text-muted">{label}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-tap px-2 font-semibold text-secondary"
        >
          Annuler
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {fields.map((field) => {
          const title = fieldLabel(field, isCardio, profile);
          const hint = `${title} · prévu ${formatPlanned(field, planned[field])}`;
          if (field === "duration_seconds") {
            return (
              <MinSecField
                key={field}
                id={`actual-${field}`}
                label={hint}
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
          const isDistance = field === "distance_meters";
          return (
            <NumberField
              key={field}
              id={`actual-${field}`}
              label={hint}
              value={values[field]}
              step={STEPPER[field].step}
              decimal={STEPPER[field].decimal}
              min={SET_LIMITS[field].min}
              max={SET_LIMITS[field].max}
              toDisplay={isDistance ? (meters) => meters / 1000 : undefined}
              fromDisplay={isDistance ? (km) => km * 1000 : undefined}
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
        <p role="alert" className="mt-3 flex gap-1 text-sm font-semibold">
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
        className="mt-5 flex h-btn w-full items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action disabled:opacity-60"
      >
        Valider {isCardio ? "l'étape" : "la série"} {index + 1}
      </button>
    </dialog>
  );
}

export default ActualSetSheet;
