import { useState } from "react";
import {
  type DraftExercise,
  formatSetValues,
  formatTrackedMeasures,
  getMeasureProfile,
  getSetFieldDisplay,
  getSetFieldLabel,
  getSetFieldStepper,
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
import SortableList from "../../../components/SortableList";
import RestInput from "./RestInput";

type Props = {
  exercise: DraftExercise;
  // "Retirer l'exercice" of the header (A7a)
  onRemove: () => void;
  onUpdateSet: (index: number, values: Partial<PlannedSetValues>) => void;
  onAddSet: () => void;
  onDuplicateLastSet: () => void;
  onRemoveSet: (index: number) => void;
  // The order of the sets of the exercise (US-16)
  onMoveSet: (from: number, to: number) => void;
  // "Chaque côté" and "Même charge des deux côtés" of A7e (US-51)
  onChangePerSide: (isPerSide: boolean) => void;
  onChangeSameLoad: (isSame: boolean) => void;
  onChangeRest: (seconds: number | null) => void;
  // Timed block: one objective per round, and no rest per set (US-43)
  isTimed?: boolean;
  // "Valider l'exercice" and the back arrow both return to the block
  onDone: () => void;
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
  onMoveSet,
  onChangePerSide,
  onChangeSameLoad,
  onChangeRest,
  onDone,
  isTimed = false,
}: Props) {
  const profile = getMeasureProfile(
    exercise.measure_codes,
    exercise.is_bodyweight,
  );
  const allFields = getSetFields(
    exercise.measure_codes,
    exercise.is_bodyweight,
    exercise.is_per_side ?? false,
  );
  const isPerSide = exercise.is_per_side ?? false;
  // One load for both sides, or one per side (A7e). The switch is kept
  // here: two empty fields look the same as none in the draft.
  const [hasTwoLoads, setHasTwoLoads] = useState(() =>
    exercise.sets.some(
      (set) => set.weight_left_kg !== null || set.weight_right_kg !== null,
    ),
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

  let fields =
    profile === "bodyweight" && !showWeight
      ? allFields.filter((field) => field !== "weight_kg")
      : allFields;
  // Per side: one load, or one per side, never both (A7e).
  fields = fields.filter((field) =>
    field === "weight_kg"
      ? !(isPerSide && hasTwoLoads)
      : field === "weight_left_kg" || field === "weight_right_kg"
        ? isPerSide && hasTwoLoads
        : true,
  );
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

  function moveSet(from: number, to: number) {
    setMenuIndex(null);
    onMoveSet(from, to);
    // The errors are kept by position, so they are dropped after a move.
    setErrors({});
    setOpenIndex((current) => shiftIndex(current, from, to));
    setOwnRest((current) => current.map((i) => shiftIndex(i, from, to)));
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
    const label = getSetFieldLabel(field, profile, isPerSide);
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
    // The unit of the screen (kg or lb, km or mi) and its step (US-05)
    const stepper = getSetFieldStepper(field);
    const display = getSetFieldDisplay(field);
    return (
      <NumberField
        key={field}
        id={id}
        label={label}
        labelTone="muted"
        value={set[field]}
        step={stepper.step}
        decimal={stepper.decimal}
        grid={stepper.grid}
        min={SET_LIMITS[field].min}
        max={SET_LIMITS[field].max}
        toDisplay={display?.toDisplay}
        fromDisplay={display?.fromDisplay}
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

        {/* A7e: the exercise is done left then right (US-51). */}
        {profile !== "none" && profile !== "cardio" && (
          <div className="flex flex-col gap-2.5 rounded-card border border-base-300 bg-base-100 p-3 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span id="side-toggle-label" className="font-semibold">
                  Chaque côté
                </span>
                <span id="side-toggle-help" className="text-sm text-muted">
                  Gauche puis droite, même objectif pour chaque côté
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isPerSide}
                aria-labelledby="side-toggle-label"
                aria-describedby="side-toggle-help"
                onClick={() => onChangePerSide(!isPerSide)}
                className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors ${
                  isPerSide
                    ? "border-primary bg-primary"
                    : "border-base-300 bg-soft"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute top-1 size-6 rounded-full bg-base-100 shadow-card transition-all ${
                    isPerSide ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>

            {isPerSide && allFields.includes("weight_kg") && (
              <div className="flex items-center justify-between gap-3 border-t border-base-300 pt-2.5">
                <div className="flex flex-col">
                  <span id="same-load-label" className="font-semibold">
                    Même charge des deux côtés
                  </span>
                  <span id="same-load-help" className="text-sm text-muted">
                    Désactive pour une charge par côté (blessure, déséquilibre)
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!hasTwoLoads}
                  aria-labelledby="same-load-label"
                  aria-describedby="same-load-help"
                  onClick={() => {
                    setHasTwoLoads(!hasTwoLoads);
                    onChangeSameLoad(hasTwoLoads);
                  }}
                  className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors ${
                    hasTwoLoads
                      ? "border-base-300 bg-soft"
                      : "border-primary bg-primary"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute top-1 size-6 rounded-full bg-base-100 shadow-card transition-all ${
                      hasTwoLoads ? "left-1" : "left-7"
                    }`}
                  />
                </button>
              </div>
            )}

            {isPerSide && profile === "duration" && (
              <p className="border-t border-base-300 pt-2.5 text-sm text-muted">
                Pendant la séance : minuteur gauche, puis droite. Vaut aussi
                pour les étirements.
              </p>
            )}
          </div>
        )}

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

        {isTimed ? (
          <p className="rounded-card border border-base-300 bg-base-100 p-4 text-sm leading-[1.45] text-muted shadow-card">
            Un seul objectif, répété à chaque tour. Le repos d'un bloc
            chronométré se prend entre les tours, pas entre les séries.
          </p>
        ) : (
          <RestInput
            id="default-rest"
            label="Repos par défaut"
            value={exercise.default_rest_seconds}
            onChange={onChangeRest}
          />
        )}

        {profile !== "none" && (
          <SortableList
            label={`${setNoun}s`}
            gapClass="gap-2.5"
            gender="f"
            onMove={moveSet}
            items={exercise.sets.map((_set, index) => ({
              // A set has no id of its own: its position is its identity
              id: `set-${index}`,
              label: getSetLabel(profile, index),
              content: null,
            }))}
            renderRow={(item, handle) => {
              const index = Number(item.id.slice("set-".length));
              const set = exercise.sets[index];
              if (set === undefined) {
                return null;
              }
              const label = item.label;
              const isOpen = index === openIndex;
              return (
                <div
                  className={`flex flex-col gap-2.5 rounded-card bg-base-100 ${
                    isOpen
                      ? "border-[1.5px] border-secondary p-3.5 shadow-next"
                      : "border border-base-300 px-3.5 py-3 shadow-card"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    {handle}
                    {isOpen ? (
                      <h2 className="flex-1 font-sans text-sm font-extrabold normal-case not-italic">
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
                          {!isTimed && (
                            <button
                              type="button"
                              onClick={() => toggleOwnRest(index)}
                              className="min-h-tap rounded-btn px-3 text-left font-semibold"
                            >
                              {ownRest.includes(index)
                                ? "Même repos que l'exercice"
                                : "Repos différent"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => moveSet(index, index - 1)}
                            disabled={index === 0}
                            className="min-h-tap rounded-btn px-3 text-left font-semibold disabled:opacity-60"
                          >
                            Monter
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSet(index, index + 1)}
                            disabled={index === exercise.sets.length - 1}
                            className="min-h-tap rounded-btn px-3 text-left font-semibold disabled:opacity-60"
                          >
                            Descendre
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
                </div>
              );
            }}
          />
        )}

        {profile !== "none" && !isTimed && (
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

// Where an index lands once the set at "from" has moved to "to": the open
// set and the sets with their own rest follow their set.
function shiftIndex(index: number, from: number, to: number): number {
  if (index === from) {
    return to;
  }
  if (from < to && index > from && index <= to) {
    return index - 1;
  }
  if (from > to && index >= to && index < from) {
    return index + 1;
  }
  return index;
}

export default SetConfigurator;
