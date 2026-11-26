import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  type ActualSetValues,
  type DeclarationPlan,
  describeDeclaredExercise,
  formatSetValues,
  formatShortDayMonth,
  getDeclaredExerciseState,
  getMeasureProfile,
  getSetLabel,
  plannedAsActual,
  todayInParis,
  toPlannedValues,
  type WorkoutExerciseTree,
  type WorkoutSetRow,
} from "shared";
import checkIcon from "../../../assets/icons/ui/app/check.svg";
import chevronDownIcon from "../../../assets/icons/ui/app/chevron-down.svg";
import chevronRightIcon from "../../../assets/icons/ui/app/chevron-right.svg";
import ConfirmDialog from "../../../components/ConfirmDialog";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
import LoadingState from "../../../components/LoadingState";
import PageHeader from "../../../components/PageHeader";
import { isAbortError } from "../../../services/api";
import { ApiError } from "../../../services/apiError";
import ActualSetSheet from "../components/ActualSetSheet";
import {
  declareSessionDone,
  readDeclaration,
} from "../services/workoutSessionService";

// The chip on the right of an exercise (CAL-08b).
const CHIP: Record<string, { label: string; className: string }> = {
  done: {
    label: "Validé",
    className: "bg-status-done/10 text-status-done-text",
  },
  partial: {
    label: "À vérifier",
    className: "bg-status-pending/10 text-status-pending-text",
  },
  todo: { label: "Non renseigné", className: "bg-neutral/[0.06] text-muted" },
};

// Screen CAL-08b: a session done without the app. Every set starts from
// the plan but stays unconfirmed until the user says so (US-38).
function DeclareAfterwardsPage() {
  const params = useParams();
  const id = Number(params.appointmentId);
  const navigate = useNavigate();
  const [plan, setPlan] = useState<DeclarationPlan | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [actualDate, setActualDate] = useState("");
  // The sets the user confirmed, by planned set id
  const [confirmed, setConfirmed] = useState<Map<number, ActualSetValues>>(
    new Map(),
  );
  const [openExerciseId, setOpenExerciseId] = useState<number | null>(null);
  const [editing, setEditing] = useState<{
    set: WorkoutSetRow;
    index: number;
    exercise: WorkoutExerciseTree;
  } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isAskingEmpty, setIsAskingEmpty] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is listed on purpose, it re-runs the load
  useEffect(() => {
    const controller = new AbortController();
    setLoadError(null);
    readDeclaration(id, controller.signal)
      .then((data) => {
        setPlan(data);
        setActualDate(data.appointment.planned_date);
      })
      .catch((caught: unknown) => {
        if (isAbortError(caught)) {
          return;
        }
        setLoadError(
          caught instanceof ApiError && caught.status === 409
            ? "Cette séance ne se déclare pas."
            : "Impossible de charger cette séance.",
        );
      });
    return () => controller.abort();
  }, [id, attempt]);

  const exercises =
    plan?.blocks.flatMap((block) => block.exercises) ?? ([] as const);
  const allSets = exercises.flatMap((exercise) => exercise.sets);

  function confirmSet(set: WorkoutSetRow, values: ActualSetValues) {
    setConfirmed((current) => new Map(current).set(set.id, values));
  }

  function forgetSet(set: WorkoutSetRow) {
    setConfirmed((current) => {
      const next = new Map(current);
      next.delete(set.id);
      return next;
    });
  }

  // "Tout s'est passé comme prévu": every set takes its planned values.
  function confirmEverything() {
    const next = new Map<number, ActualSetValues>();
    for (const set of allSets) {
      next.set(set.id, plannedAsActual(set));
    }
    setConfirmed(next);
  }

  async function save() {
    if (isSending) {
      return;
    }
    setIsSending(true);
    setSendError(null);
    setIsAskingEmpty(false);
    try {
      const created = await declareSessionDone(id, {
        actual_date: actualDate,
        sets: [...confirmed.entries()].map(([plannedSetId, values]) => ({
          planned_set_id: plannedSetId,
          values,
        })),
      });
      navigate(`/entrainement/${created.id}/resume`, { replace: true });
    } catch (caught: unknown) {
      setSendError(
        caught instanceof ApiError
          ? caught.message
          : "Impossible d'enregistrer cette séance.",
      );
      setIsSending(false);
    }
  }

  if (loadError !== null) {
    return (
      <div className="mx-auto max-w-md p-4">
        <ErrorState
          title={loadError}
          message="Vérifie ta connexion internet, puis réessaie."
          onRetry={() => setAttempt((count) => count + 1)}
        />
      </div>
    );
  }

  if (plan === null) {
    return (
      <div className="mx-auto max-w-md p-4">
        <LoadingState label="Chargement de la séance…" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <PageHeader
        onBack={() => navigate(`/seances/${id}`)}
        backLabel="Retour à la séance"
        title={`Déclarer « ${plan.appointment.session_name} »`}
        subtitle="Après coup"
      />

      <div className="flex flex-1 flex-col gap-3 px-[18px] pt-1 pb-32">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1.5">
            <span className="font-sans text-overline uppercase not-italic text-muted">
              Date prévue
            </span>
            <p className="flex h-field items-center rounded-btn border border-base-300 bg-soft px-4 text-[15px] text-muted">
              {formatShortDayMonth(plan.appointment.planned_date)}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="actual-date"
              className="font-sans text-overline uppercase not-italic text-accent"
            >
              Date réelle
            </label>
            <input
              id="actual-date"
              type="date"
              value={actualDate}
              max={todayInParis()}
              onChange={(event) => setActualDate(event.target.value)}
              className="h-field w-full min-w-0 rounded-btn border border-base-300 bg-base-100 px-4 text-[15px] shadow-card"
            />
          </div>
        </div>

        <span className="font-sans text-overline uppercase not-italic text-accent">
          {`Exercices · ${allSets.length} séries prévues`}
        </span>

        <ul aria-label="Exercices de la séance" className="flex flex-col gap-2">
          {exercises.map((exercise) => {
            const count = exercise.sets.filter((set) =>
              confirmed.has(set.id),
            ).length;
            const state = getDeclaredExerciseState(count, exercise.sets.length);
            const chip = CHIP[state] ?? CHIP.todo;
            const isOpen = openExerciseId === exercise.id;
            const profile = getMeasureProfile(
              exercise.measure_codes,
              exercise.is_bodyweight,
            );
            return (
              <li
                key={exercise.id}
                className="overflow-hidden rounded-card border border-base-300 bg-base-100 shadow-card"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenExerciseId(isOpen ? null : exercise.id)}
                  className="flex min-h-[54px] w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <b className="truncate text-sm">{exercise.name}</b>
                    <span className="truncate text-xs font-medium leading-[1.45] text-muted">
                      {describeDeclaredExercise(count, exercise.sets.length)}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-chip px-2 py-[3px] text-[10px] font-extrabold uppercase tracking-[0.06em] ${chip?.className ?? ""}`}
                  >
                    {chip?.label}
                  </span>
                  <Icon
                    src={isOpen ? chevronDownIcon : chevronRightIcon}
                    className="size-[18px] shrink-0 text-faint"
                  />
                </button>

                {isOpen && (
                  <ul
                    aria-label={`Séries de ${exercise.name}`}
                    className="flex flex-col gap-2 border-t border-base-300 p-3"
                  >
                    {exercise.sets.map((set, index) => {
                      const values = confirmed.get(set.id);
                      return (
                        <li
                          key={set.id}
                          className="flex items-center gap-2.5 rounded-card border border-base-300 px-3 py-2"
                        >
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <b className="text-[13px]">
                              {getSetLabel(profile, index)}
                            </b>
                            <span className="truncate text-xs text-muted">
                              {values === undefined
                                ? `Prévu : ${formatSetValues(
                                    toPlannedValues(set),
                                    exercise.measure_codes,
                                    exercise.is_bodyweight,
                                  )}`
                                : formatSetValues(
                                    {
                                      ...values,
                                      weight_left_kg: null,
                                      weight_right_kg: null,
                                      rest_after_seconds: null,
                                    },
                                    exercise.measure_codes,
                                    exercise.is_bodyweight,
                                  )}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditing({ set, index, exercise })}
                            className="h-11 shrink-0 rounded-btn border border-base-300 px-3 text-xs font-bold"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            aria-pressed={values !== undefined}
                            onClick={() =>
                              values === undefined
                                ? confirmSet(set, plannedAsActual(set))
                                : forgetSet(set)
                            }
                            className={`grid size-11 shrink-0 place-items-center rounded-btn ${
                              values === undefined
                                ? "border border-base-300"
                                : "bg-status-done text-white"
                            }`}
                          >
                            <span className="sr-only">
                              {values === undefined
                                ? `Confirmer la ${getSetLabel(
                                    profile,
                                    index,
                                  ).toLowerCase()}`
                                : `Annuler la ${getSetLabel(
                                    profile,
                                    index,
                                  ).toLowerCase()}`}
                            </span>
                            <Icon src={checkIcon} className="size-4" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        {sendError !== null && (
          <p role="alert" className="text-sm font-semibold">
            {sendError}
          </p>
        )}
      </div>

      {editing !== null && (
        <ActualSetSheet
          set={editing.set}
          index={editing.index}
          measureCodes={editing.exercise.measure_codes}
          isBodyweight={editing.exercise.is_bodyweight}
          onConfirm={(values) => {
            confirmSet(editing.set, values);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {isAskingEmpty && (
        <ConfirmDialog
          title="Aucune série n'est confirmée"
          message="Enregistrer quand même cette séance comme inachevée ?"
          confirmLabel="Enregistrer"
          cancelLabel="Revenir"
          isSending={isSending}
          onConfirm={save}
          onCancel={() => setIsAskingEmpty(false)}
        />
      )}

      <div className="fixed inset-x-0 bottom-0 flex flex-col gap-2.5 px-[18px] pt-3 pb-1">
        <div className="mx-auto flex w-full max-w-md flex-col gap-2.5">
          <button
            type="button"
            onClick={confirmEverything}
            disabled={isSending || confirmed.size === allSets.length}
            className="flex h-13 items-center justify-center gap-2 rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card disabled:opacity-60"
          >
            <Icon src={checkIcon} className="size-4" />
            Tout s'est passé comme prévu
          </button>
          <button
            type="button"
            onClick={() =>
              confirmed.size === 0 ? setIsAskingEmpty(true) : save()
            }
            disabled={isSending || actualDate === ""}
            className="flex h-btn items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60"
          >
            {isSending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeclareAfterwardsPage;
