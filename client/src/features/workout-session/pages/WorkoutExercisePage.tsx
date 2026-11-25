import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  type ActualSetValues,
  formatDuration,
  formatSetValues,
  getMeasureProfile,
  getRestDuration,
  getSetLabel,
  plannedAsActual,
  toPlannedValues,
  type WorkoutExerciseTree,
  type WorkoutSetRow,
} from "shared";
import chevronLeftIcon from "../../../assets/icons/ui/chevrons/chevron-left.svg";
import chevronRightIcon from "../../../assets/icons/ui/chevrons/chevron-right.svg";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
import LoadingState from "../../../components/LoadingState";
import ActualSetSheet from "../components/ActualSetSheet";
import RestTimer from "../components/RestTimer";
import SetRow from "../components/SetRow";
import { useValidateSet } from "../hooks/useValidateSet";
import { useWorkoutSession } from "../hooks/useWorkoutSession";
import {
  addWorkoutSet,
  removeWorkoutSet,
} from "../services/workoutSessionService";

const PRIMARY_LINK =
  "flex h-btn w-full items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action";

// "repos 1 min 30 s", "repos 45 s", "repos 2 min".
function formatRest(seconds: number | null): string | null {
  if (seconds === null) {
    return null;
  }
  const text = formatDuration(seconds);
  return /\d+ min \d+$/.test(text) ? `${text} s` : text;
}

// The rest shown after a validated set (B4).
type Rest = {
  durationSeconds: number;
  isSetRest: boolean;
  nextLabel: string;
};

// What comes after the set just done: the next set of the exercise, the next
// exercise, or nothing more.
function describeNext(
  exercise: WorkoutExerciseTree,
  setIndex: number,
  nextExercise: WorkoutExerciseTree | undefined,
): string {
  const profile = getMeasureProfile(
    exercise.measure_codes,
    exercise.is_bodyweight,
  );
  const nextSet = exercise.sets[setIndex + 1];
  if (nextSet !== undefined) {
    const label = getSetLabel(profile, setIndex + 1).toLowerCase();
    const planned = formatSetValues(
      toPlannedValues(nextSet),
      exercise.measure_codes,
      exercise.is_bodyweight,
    ).toLowerCase();
    return `${label} · prévu ${planned}`;
  }
  if (nextExercise !== undefined) {
    return `exercice suivant, ${nextExercise.name}`;
  }
  return "dernière série de la séance faite";
}

// Screen B3: one exercise of the session in progress, set by set. One tap
// when done as planned, "Modifier" otherwise; the order is free (RM-024).
// Every validated set starts the rest timer (US-30).
function WorkoutExercisePage() {
  const params = useParams();
  const navigate = useNavigate();
  const sessionId = Number(params.id);
  const exerciseId = Number(params.exerciseId);
  // While a set is being added or removed, the buttons wait.
  const [isChanging, setIsChanging] = useState(false);
  // The seconds measured by the stopwatch, waiting for the reading (B5f)
  const [measured, setMeasured] = useState<number | null>(null);
  const { session, isLoading, notFound, error, reload, replaceSet } =
    useWorkoutSession(sessionId);
  const validation = useValidateSet({ onReplace: replaceSet });
  // The set chosen with "Faire"; otherwise the first one not done yet
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [editing, setEditing] = useState<{
    set: WorkoutSetRow;
    index: number;
  } | null>(null);
  const [rest, setRest] = useState<Rest | null>(null);

  const exercises: WorkoutExerciseTree[] =
    session?.blocks.flatMap((block) => block.exercises) ?? [];
  const position = exercises.findIndex(
    (exercise) => exercise.id === exerciseId,
  );
  const exercise = position === -1 ? null : exercises[position];
  const next = position === -1 ? undefined : exercises[position + 1];

  const firstUndone =
    exercise?.sets.findIndex((set) => set.validated_at === null) ?? -1;
  const activeIndex =
    pickedIndex !== null && exercise?.sets[pickedIndex] !== undefined
      ? pickedIndex
      : firstUndone === -1
        ? null
        : firstUndone;

  // Nothing left to do in the whole session once this set is validated.
  function isLastSetOfSession(set: WorkoutSetRow): boolean {
    return exercises.every((item) =>
      item.sets.every(
        (other) => other.id === set.id || other.validated_at !== null,
      ),
    );
  }

  // The rest starts as soon as the set is validated (RM-023 for its length).
  function startRest(set: WorkoutSetRow, index: number) {
    if (exercise === undefined || exercise === null) {
      return;
    }
    setRest({
      durationSeconds: getRestDuration(set, exercise),
      isSetRest: set.planned_rest_seconds !== null,
      nextLabel: describeNext(exercise, index, next),
    });
  }

  // What happens once a set is recorded: the rest, or the way out when the
  // session has nothing left to do (correction US-30). In that case the
  // server answer is waited for, so the next screen sees the set as done.
  function afterValidation(
    set: WorkoutSetRow,
    index: number,
    saving: Promise<void>,
  ) {
    setPickedIndex(null);
    if (isLastSetOfSession(set)) {
      saving.then(() => navigate(`/entrainement/${sessionId}`));
      return;
    }
    startRest(set, index);
  }

  function validateAsPlanned(set: WorkoutSetRow, index: number) {
    afterValidation(set, index, validation.validate(set, plannedAsActual(set)));
  }

  // The time measured by the app (US-49). For an exercise in time the set
  // is validated with it; for a cardio stage the machine reading opens, its
  // duration already filled (B5f).
  function finishTimed(set: WorkoutSetRow, index: number, seconds: number) {
    if (exercise === undefined || exercise === null) {
      return;
    }
    const profile = getMeasureProfile(
      exercise.measure_codes,
      exercise.is_bodyweight,
    );
    if (profile === "cardio") {
      setMeasured(seconds);
      setEditing({ set, index });
      return;
    }
    afterValidation(
      set,
      index,
      validation.validate(set, {
        ...plannedAsActual(set),
        duration_seconds: seconds,
      }),
    );
  }

  function confirmEdited(values: ActualSetValues) {
    if (editing !== null) {
      const saving = validation.validate(editing.set, values);
      const { set, index } = editing;
      setEditing(null);
      setMeasured(null);
      afterValidation(set, index, saving);
    }
  }

  if (rest !== null && exercise !== undefined && exercise !== null) {
    return (
      <RestTimer
        exerciseName={exercise.name}
        durationSeconds={rest.durationSeconds}
        isSetRest={rest.isSetRest}
        nextLabel={rest.nextLabel}
        onFinish={() => setRest(null)}
      />
    );
  }

  const backLink = (
    <Link
      to={`/entrainement/${sessionId}`}
      className="flex min-h-tap items-center gap-1 pr-2 font-semibold text-secondary"
    >
      <Icon src={chevronLeftIcon} className="size-6" />
      Exercices
    </Link>
  );

  // "+ Ajouter une série": one more set at the end, with nothing planned.
  async function addSet() {
    if (isChanging) {
      return;
    }
    setIsChanging(true);
    try {
      await addWorkoutSet(exerciseId);
      reload();
    } finally {
      setIsChanging(false);
    }
  }

  // The trash of a set added during the session (RM-048).
  async function removeSet(setId: number) {
    if (isChanging) {
      return;
    }
    setIsChanging(true);
    try {
      await removeWorkoutSet(setId);
      setPickedIndex(null);
      reload();
    } finally {
      setIsChanging(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="sticky top-0 z-10 flex min-h-14 items-center gap-2 border-b border-base-300 bg-base-100 px-2 py-2">
        {backLink}
        {exercise !== undefined && exercise !== null && (
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-display-sm">{exercise.name}</h1>
            <p className="text-sm text-muted">
              Exercice {position + 1} / {exercises.length}
              {formatRest(exercise.default_rest_seconds) === null
                ? ""
                : ` · repos ${formatRest(exercise.default_rest_seconds)}`}
            </p>
          </div>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pb-28">
        {isLoading && <LoadingState label="Chargement de l'exercice…" />}

        {!isLoading &&
          (notFound || (session !== null && exercise === null)) && (
            <EmptyState
              title="Exercice introuvable"
              message="Il n'est pas dans cette séance, ou elle ne t'appartient pas."
            >
              <Link to="/" className={PRIMARY_LINK}>
                Retour à l'accueil
              </Link>
            </EmptyState>
          )}

        {!isLoading && !notFound && error !== null && (
          <ErrorState
            title="Impossible de charger l'exercice"
            message="Vérifie ta connexion internet, puis réessaie."
            onRetry={reload}
          />
        )}

        {!isLoading &&
          session !== null &&
          exercise !== undefined &&
          exercise !== null && (
            <>
              {session.status !== "in_progress" && (
                <p
                  role="status"
                  className="rounded-card border border-base-300 bg-base-100 p-4 text-muted"
                >
                  Cette séance n'est plus en cours.
                </p>
              )}

              {validation.error !== null && (
                <ErrorState
                  title={validation.error}
                  onRetry={validation.retry}
                />
              )}

              <ul aria-label="Séries" className="flex flex-col gap-3">
                {exercise.sets.map((set, index) => (
                  <SetRow
                    key={set.id}
                    set={set}
                    index={index}
                    profile={getMeasureProfile(
                      exercise.measure_codes,
                      exercise.is_bodyweight,
                    )}
                    isBodyweight={exercise.is_bodyweight}
                    measureCodes={exercise.measure_codes}
                    state={
                      set.validated_at !== null && index !== pickedIndex
                        ? "done"
                        : index === activeIndex
                          ? "active"
                          : "upcoming"
                    }
                    isPending={validation.pendingId === set.id || isChanging}
                    onValidate={() => validateAsPlanned(set, index)}
                    onEdit={() => setEditing({ set, index })}
                    onPick={() => setPickedIndex(index)}
                    onRemove={
                      set.is_added && set.validated_at === null
                        ? () => removeSet(set.id)
                        : null
                    }
                    onTimed={(seconds) => finishTimed(set, index, seconds)}
                  />
                ))}
              </ul>

              {session.status === "in_progress" && (
                <button
                  type="button"
                  onClick={addSet}
                  disabled={isChanging}
                  className="flex h-12 items-center justify-center gap-2 rounded-btn border border-base-300 bg-base-100 font-semibold disabled:opacity-60"
                >
                  + Ajouter une série
                </button>
              )}
            </>
          )}
      </div>

      {!isLoading && exercise !== undefined && exercise !== null && (
        <div className="fixed inset-x-0 bottom-0 border-t border-base-300 bg-base-100 p-4">
          <div className="mx-auto max-w-md">
            {next !== undefined ? (
              <Link
                to={`/entrainement/${sessionId}/exercices/${next.id}`}
                onClick={() => setPickedIndex(null)}
                className="flex h-12 items-center justify-center gap-1 rounded-btn border border-base-300 bg-base-100 font-semibold"
              >
                Suivant : {next.name}
                <Icon src={chevronRightIcon} className="size-5" />
              </Link>
            ) : (
              <Link
                to={`/entrainement/${sessionId}`}
                className="flex h-12 items-center justify-center rounded-btn border border-base-300 bg-base-100 font-semibold"
              >
                Retour aux exercices
              </Link>
            )}
          </div>
        </div>
      )}

      {editing !== null && exercise !== undefined && exercise !== null && (
        <ActualSetSheet
          set={editing.set}
          index={editing.index}
          measureCodes={exercise.measure_codes}
          isBodyweight={exercise.is_bodyweight}
          measuredSeconds={measured}
          onConfirm={confirmEdited}
          onCancel={() => {
            setEditing(null);
            setMeasured(null);
          }}
        />
      )}
    </div>
  );
}

export default WorkoutExercisePage;
