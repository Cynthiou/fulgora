import { useState } from "react";
import {
  type DraftExercise,
  formatSetValues,
  formatTrackedMeasures,
  getMeasureProfile,
  getSetFieldLabel,
  getSetFields,
  getSetLabel,
  MAX_SETS_PER_EXERCISE,
  type PlannedSetValues,
  SET_LIMITS,
  type SetValueField,
  validateSetValue,
} from "shared";
import chevronLeftIcon from "../../../assets/icons/ui/chevrons/chevron-left.svg";
import Icon from "../../../components/Icon";
import MinSecField from "../../../components/MinSecField";
import NumberField from "../../../components/NumberField";
import RestInput from "./RestInput";

type Props = {
  exercise: DraftExercise;
  onUpdateSet: (index: number, values: Partial<PlannedSetValues>) => void;
  onAddSet: () => void;
  onDuplicateLastSet: () => void;
  onRemoveSet: (index: number) => void;
  onChangeRest: (seconds: number | null) => void;
  // "Valider l'exercice" and the back arrow both return to the block
  onDone: () => void;
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

// Screen A7: the planned sets of one exercise. One set is open at a time, the
// others show their values; the layout follows the measure profile (RM-010).
// Every change goes straight to the draft; "Valider l'exercice" closes the
// screen and stays disabled while a field shows an error.
function SetConfigurator({
  exercise,
  onUpdateSet,
  onAddSet,
  onDuplicateLastSet,
  onRemoveSet,
  onChangeRest,
  onDone,
}: Props) {
  const profile = getMeasureProfile(
    exercise.measure_codes,
    exercise.is_bodyweight,
  );
  const allFields = getSetFields(
    exercise.measure_codes,
    exercise.is_bodyweight,
  );
  const [openIndex, setOpenIndex] = useState(0);
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  // Field errors, by "setIndex:field"; "Valider" waits until they are gone.
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Bodyweight: the added weight ("lest") is hidden until asked for.
  const [showWeight, setShowWeight] = useState(
    exercise.sets.some((set) => set.weight_kg !== null),
  );
  // Sets with their own rest ("Repos différent").
  const [ownRest, setOwnRest] = useState<number[]>(
    exercise.sets.flatMap((set, index) =>
      set.rest_after_seconds === null ? [] : [index],
    ),
  );

  const fields =
    profile === "bodyweight" && !showWeight
      ? allFields.filter((field) => field !== "weight_kg")
      : allFields;
  const isFull = exercise.sets.length >= MAX_SETS_PER_EXERCISE;
  const hasError = Object.keys(errors).length > 0;
  const setNoun = profile === "cardio" ? "Étape" : "Série";

  function setError(key: string, message: string | null) {
    setErrors((current) => {
      if (message === null) {
        if (!(key in current)) {
          return current;
        }
        const { [key]: _gone, ...rest } = current;
        return rest;
      }
      return current[key] === message
        ? current
        : { ...current, [key]: message };
    });
  }

  function toggleWeight() {
    if (showWeight) {
      exercise.sets.forEach((set, index) => {
        if (set.weight_kg !== null) {
          onUpdateSet(index, { weight_kg: null });
        }
      });
    }
    setShowWeight(!showWeight);
  }

  function removeSet(index: number) {
    setMenuIndex(null);
    onRemoveSet(index);
    setErrors({});
    setOwnRest((current) =>
      current.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)),
    );
    setOpenIndex((current) =>
      Math.max(0, Math.min(current, exercise.sets.length - 2)),
    );
  }

  function toggleOwnRest(index: number) {
    setMenuIndex(null);
    if (ownRest.includes(index)) {
      setOwnRest(ownRest.filter((i) => i !== index));
      onUpdateSet(index, { rest_after_seconds: null });
    } else {
      setOwnRest([...ownRest, index]);
      setOpenIndex(index);
    }
  }

  function addSet() {
    onAddSet();
    setOpenIndex(exercise.sets.length);
  }

  function duplicateLastSet() {
    onDuplicateLastSet();
    setOpenIndex(exercise.sets.length);
  }

  function renderField(
    field: SetValueField,
    index: number,
    set: PlannedSetValues,
  ) {
    const id = `set-${index}-${field}`;
    const label = getSetFieldLabel(field, profile);
    const key = `${index}:${field}`;
    if (field === "duration_seconds") {
      return (
        <MinSecField
          key={field}
          id={id}
          label={label}
          value={set.duration_seconds}
          max={SET_LIMITS.duration_seconds.max}
          onChange={(value) => onUpdateSet(index, { duration_seconds: value })}
          validate={(value) => validateSetValue(field, value)}
          onErrorChange={(message) => setError(key, message)}
        />
      );
    }
    const isDistance = field === "distance_meters";
    return (
      <NumberField
        key={field}
        id={id}
        label={label}
        value={set[field]}
        step={STEPPER[field].step}
        decimal={STEPPER[field].decimal}
        min={SET_LIMITS[field].min}
        max={SET_LIMITS[field].max}
        // Stored in meters (DT-11), shown in km
        toDisplay={isDistance ? (meters) => meters / 1000 : undefined}
        fromDisplay={isDistance ? (km) => km * 1000 : undefined}
        onChange={(value) => onUpdateSet(index, { [field]: value })}
        validate={(value) => validateSetValue(field, value)}
        onErrorChange={(message) => setError(key, message)}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-base-300 bg-base-100 px-2">
        <button
          type="button"
          onClick={onDone}
          disabled={hasError}
          aria-label="Retour au bloc"
          className="flex size-tap items-center justify-center rounded-btn text-secondary disabled:opacity-60"
        >
          <Icon src={chevronLeftIcon} className="size-7" />
        </button>
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-display-sm">{exercise.name}</h1>
          {exercise.meta !== undefined && exercise.meta !== null && (
            <p className="truncate text-sm text-muted">{exercise.meta}</p>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 p-4 pb-28">
        <div className="flex flex-col gap-1">
          <p className="text-overline uppercase text-accent">
            Préparation · Objectifs prévus
          </p>
          {profile === "none" ? (
            <p role="status" className="text-muted">
              Cet exercice n'a pas de mesure : tu pourras seulement le cocher
              comme fait.
            </p>
          ) : (
            <p className="text-sm text-muted">
              Mesures suivies :{" "}
              <span className="font-semibold text-base-content">
                {formatTrackedMeasures(
                  exercise.measure_codes,
                  exercise.is_bodyweight,
                )}
              </span>
            </p>
          )}
        </div>

        {profile === "bodyweight" && (
          <div className="flex items-center justify-between gap-3 rounded-card border border-base-300 bg-base-100 p-3 shadow-card">
            <div className="flex flex-col">
              <span id="weight-toggle-label" className="font-semibold">
                Ajouter un lest
              </span>
              <span id="weight-toggle-help" className="text-sm text-muted">
                Gilet, ceinture, disque : une charge en plus du poids du corps
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showWeight}
              aria-labelledby="weight-toggle-label"
              aria-describedby="weight-toggle-help"
              onClick={toggleWeight}
              className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors ${
                showWeight
                  ? "border-primary bg-primary"
                  : "border-base-300 bg-soft"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-1 size-6 rounded-full bg-base-100 shadow-card transition-all ${
                  showWeight ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>
        )}

        <RestInput
          id="default-rest"
          label="Repos par défaut"
          value={exercise.default_rest_seconds}
          onChange={onChangeRest}
        />

        {profile !== "none" && (
          <ul aria-label={`${setNoun}s`} className="flex flex-col gap-3">
            {exercise.sets.map((set, index) => {
              const label = getSetLabel(profile, index);
              const isOpen = index === openIndex;
              return (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: a set has no id of its own, its position is its identity in the draft
                  key={index}
                  className="flex flex-col gap-3 rounded-card border border-base-300 bg-base-100 p-3 shadow-card"
                >
                  <div className="flex items-center justify-between gap-2">
                    {isOpen ? (
                      <h2 className="font-sans text-base font-semibold not-italic">
                        {label}
                      </h2>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOpenIndex(index)}
                        className="flex min-h-tap min-w-0 flex-1 flex-col text-left"
                      >
                        <span className="font-semibold">{label}</span>
                        <span className="text-sm text-muted">
                          {formatSetValues(
                            set,
                            exercise.measure_codes,
                            exercise.is_bodyweight,
                          )}
                        </span>
                      </button>
                    )}
                    <div className="relative">
                      <button
                        type="button"
                        aria-label={`Options de la ${label.toLowerCase()}`}
                        aria-expanded={menuIndex === index}
                        onClick={() =>
                          setMenuIndex(menuIndex === index ? null : index)
                        }
                        className="flex size-tap items-center justify-center rounded-btn text-xl font-bold text-secondary"
                      >
                        ⋯
                      </button>
                      {menuIndex === index && (
                        <div className="absolute right-0 z-10 flex w-48 flex-col rounded-card border border-base-300 bg-base-100 p-1 shadow-card">
                          <button
                            type="button"
                            onClick={() => toggleOwnRest(index)}
                            className="min-h-tap rounded-btn px-3 text-left font-semibold"
                          >
                            {ownRest.includes(index)
                              ? "Même repos que l'exercice"
                              : "Repos différent"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSet(index)}
                            disabled={exercise.sets.length <= 1}
                            className="min-h-tap rounded-btn px-3 text-left font-semibold disabled:opacity-60"
                          >
                            Retirer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="flex flex-col gap-3">
                      {fields.map((field) => renderField(field, index, set))}
                      {ownRest.includes(index) && (
                        <RestInput
                          id={`set-${index}-rest`}
                          label={`Repos de la ${label.toLowerCase()}`}
                          value={set.rest_after_seconds}
                          onChange={(value) =>
                            onUpdateSet(index, { rest_after_seconds: value })
                          }
                        />
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {profile !== "none" && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={addSet}
              disabled={isFull}
              aria-describedby={isFull ? "sets-limit" : undefined}
              className="flex h-12 items-center justify-center gap-2 rounded-btn border border-base-300 bg-base-100 font-semibold disabled:opacity-60"
            >
              + {setNoun}
            </button>
            {profile !== "cardio" && (
              <button
                type="button"
                onClick={duplicateLastSet}
                disabled={isFull}
                className="flex h-12 items-center justify-center rounded-btn border border-base-300 bg-base-100 font-semibold disabled:opacity-60"
              >
                Dupliquer la dernière
              </button>
            )}
            {isFull && (
              <p id="sets-limit" className="text-sm text-muted">
                {MAX_SETS_PER_EXERCISE} séries au maximum
              </p>
            )}
            {profile === "duration" && (
              <p className="text-sm text-muted">
                Pendant la séance : minuteur ou chrono au choix.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-base-300 bg-base-100 p-4">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={onDone}
            disabled={hasError}
            className="flex h-btn w-full items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action disabled:opacity-60"
          >
            Valider l'exercice
          </button>
        </div>
      </div>
    </div>
  );
}

export default SetConfigurator;
