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
import checkIcon from "../../../assets/icons/ui/app/check.svg";
import copyIcon from "../../../assets/icons/ui/app/copy.svg";
import dotsIcon from "../../../assets/icons/ui/app/dots.svg";
import plusIcon from "../../../assets/icons/ui/app/plus.svg";
import trashIcon from "../../../assets/icons/ui/app/trash.svg";
import Icon from "../../../components/Icon";
import MinSecField from "../../../components/MinSecField";
import NumberField from "../../../components/NumberField";
import PageHeader from "../../../components/PageHeader";
import RestInput from "./RestInput";

type Props = {
  exercise: DraftExercise;
  // "Retirer l'exercice" of the header (A7a)
  onRemove: () => void;
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
  onRemove,
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
          labelTone="muted"
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
        labelTone="muted"
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
      <PageHeader
        onBack={hasError ? undefined : onDone}
        backLabel="Retour au bloc"
        title={exercise.name}
        subtitle={exercise.meta ?? undefined}
        action={
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Retirer ${exercise.name}`}
            className="grid size-tap shrink-0 place-items-center rounded-btn text-status-missed"
          >
            <Icon src={trashIcon} className="size-5" />
          </button>
        }
      />

      <div className="flex flex-1 flex-col gap-2.5 px-[18px] pt-1 pb-28">
        <div className="flex flex-col gap-1.5">
          <p className="self-start rounded-chip bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-accent-text">
            Préparation · Objectifs prévus
          </p>
          {profile === "none" ? (
            <p role="status" className="text-muted">
              Cet exercice n'a pas de mesure : tu pourras seulement le cocher
              comme fait.
            </p>
          ) : (
            <p className="text-[13px] font-medium leading-[1.45] text-muted">
              Mesures suivies :{" "}
              <span className="font-bold text-base-content">
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
          <ul aria-label={`${setNoun}s`} className="flex flex-col gap-2.5">
            {exercise.sets.map((set, index) => {
              const label = getSetLabel(profile, index);
              const isOpen = index === openIndex;
              return (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: a set has no id of its own, its position is its identity in the draft
                  key={index}
                  className={`flex flex-col gap-2.5 rounded-card bg-base-100 ${
                    isOpen
                      ? "border-[1.5px] border-secondary p-3.5 shadow-next"
                      : "border border-base-300 px-3.5 py-3 shadow-card"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    {isOpen ? (
                      <h2 className="font-sans text-sm font-extrabold normal-case not-italic">
                        {label}
                      </h2>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOpenIndex(index)}
                        className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 text-left"
                      >
                        <span className="text-sm font-bold">{label}</span>
                        <span className="text-right text-xs font-medium leading-[1.35] text-muted">
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
                        className="grid size-tap place-items-center rounded-btn text-muted"
                      >
                        <Icon src={dotsIcon} className="size-5" />
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
                    <div className="grid grid-cols-2 gap-2">
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addSet}
                disabled={isFull}
                aria-describedby={isFull ? "sets-limit" : undefined}
                className="flex h-13 flex-1 items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-dash text-sm font-bold text-secondary disabled:opacity-60"
              >
                <Icon src={plusIcon} className="size-[18px]" />
                {/* "Série" on screen, "Ajouter une série" read aloud. */}
                <span className="sr-only">
                  Ajouter une {setNoun.toLowerCase()}
                </span>
                <span aria-hidden="true">{setNoun}</span>
              </button>
              {profile !== "cardio" && (
                <button
                  type="button"
                  onClick={duplicateLastSet}
                  disabled={isFull}
                  className="flex h-13 flex-1 items-center justify-center gap-2 rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card disabled:opacity-60"
                >
                  <Icon src={copyIcon} className="size-[18px]" />
                  <span className="sr-only">Dupliquer la dernière</span>
                  <span aria-hidden="true">Dupliquer</span>
                </button>
              )}
            </div>
            {isFull && (
              <p id="sets-limit" className="text-xs text-muted">
                {MAX_SETS_PER_EXERCISE} séries au maximum
              </p>
            )}
            {profile === "duration" && (
              <p className="text-xs text-muted">
                Pendant la séance : minuteur ou chrono au choix.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 px-[18px] pt-3 pb-1">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={onDone}
            disabled={hasError}
            className="flex h-btn w-full items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60"
          >
            <Icon src={checkIcon} className="size-[18px]" />
            Valider l'exercice
          </button>
        </div>
      </div>
    </div>
  );
}

export default SetConfigurator;
