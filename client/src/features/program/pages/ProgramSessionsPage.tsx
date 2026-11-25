import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  canActivateProgram,
  countProgramAppointments,
  countProgramWeeks,
  describeAddedSessions,
  formatPeriod,
  formatPeriodShort,
  formatReadySessions,
  getWeekdayLabel,
  type ProgramCreated,
  type ProgramDetailFull,
  type ProgramSessionSummary,
} from "shared";
import chevronRightIcon from "../../../assets/icons/ui/app/chevron-right.svg";
import plusIcon from "../../../assets/icons/ui/app/plus.svg";
import trashIcon from "../../../assets/icons/ui/app/trash.svg";
import ConfirmDialog from "../../../components/ConfirmDialog";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
import LoadingState from "../../../components/LoadingState";
import PageHeader from "../../../components/PageHeader";
import UndoToast from "../../../components/UndoToast";
import { isAbortError } from "../../../services/api";
import { ApiError } from "../../../services/apiError";
import AddSessionOnDaySheet from "../components/AddSessionOnDaySheet";
import StepBar from "../components/StepBar";
import {
  activateProgram,
  addProgramSession,
  deleteProgramDraft,
  readProgram,
  removeProgramSession,
  restoreProgramSession,
} from "../services/programService";

const PRIMARY_BUTTON =
  "flex h-btn w-full items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60";
const SECONDARY_BUTTON =
  "flex h-btn w-full items-center justify-center rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card disabled:opacity-60";

// Screens PRO-03, PRO-03v and PRO-03f, step 2 of 3: one session per chosen
// day. "Créer le programme" waits for every session to hold an exercise
// (RM-072); the draft can be left as it is at any time (RM-071).
function ProgramSessionsPage() {
  const params = useParams();
  const navigate = useNavigate();
  const id = Number(params.programId);
  const [program, setProgram] = useState<ProgramDetailFull | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [created, setCreated] = useState<ProgramCreated | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  // The day whose "+ Autre séance" panel is open (PRO-03a)
  const [addingOn, setAddingOn] = useState<number | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  // The session just removed, which "Annuler" puts back (PRO-03d)
  const [removed, setRemoved] = useState<ProgramSessionSummary | null>(null);

  async function addSession(name: string, plannedTime: string | null) {
    if (addingOn === null) {
      return;
    }
    setIsSending(true);
    setAddError(null);
    try {
      setProgram(
        await addProgramSession(id, {
          weekday: addingOn,
          name,
          planned_time: plannedTime,
        }),
      );
      setAddingOn(null);
    } catch {
      setAddError("Impossible d'ajouter cette séance.");
    } finally {
      setIsSending(false);
    }
  }

  async function removeSession(session: ProgramSessionSummary) {
    setIsSending(true);
    try {
      setProgram(await removeProgramSession(id, session.schedule_id));
      setRemoved(session);
    } catch {
      setError("Impossible de retirer cette séance.");
    } finally {
      setIsSending(false);
    }
  }

  async function undoRemove() {
    if (removed === null) {
      return;
    }
    const session = removed;
    setRemoved(null);
    try {
      setProgram(await restoreProgramSession(id, session.schedule_id));
    } catch {
      setError("Impossible de remettre cette séance.");
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is listed on purpose, it re-runs the load
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    readProgram(id, controller.signal)
      .then((data) => {
        setProgram(data);
        setIsLoading(false);
      })
      .catch((caught: unknown) => {
        if (isAbortError(caught)) {
          return;
        }
        setError(
          caught instanceof ApiError && caught.status === 404
            ? "Programme introuvable"
            : "Impossible de charger le programme.",
        );
        setIsLoading(false);
      });
    return () => controller.abort();
  }, [id, attempt]);

  async function create() {
    setIsSending(true);
    setError(null);
    try {
      setCreated(await activateProgram(id));
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Impossible de créer le programme. Réessaie.",
      );
    } finally {
      setIsSending(false);
    }
  }

  async function removeDraft() {
    setIsSending(true);
    try {
      await deleteProgramDraft(id);
      navigate("/planning", { replace: true });
    } catch {
      setError("Impossible de supprimer le brouillon.");
      setIsSending(false);
    }
  }

  // Screen PRO-06: the program is created and the Planning is full.
  if (created !== null && program !== null) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-4">
        <h1 className="text-display-md">Programme créé</h1>
        <p className="rounded-card border border-base-300 bg-base-100 p-4 shadow-card">
          <span className="font-semibold">
            {created.appointment_count} séances ajoutées au Planning
          </span>
          {created.first_date !== null && created.last_date !== null && (
            <>, {formatPeriod(created.first_date, created.last_date)}.</>
          )}
        </p>
        <p className="text-muted">
          {created.status === "programmed"
            ? `Statut « À venir » jusqu'au ${program.start_date}.`
            : "Statut « En cours » : la première séance t'attend."}
        </p>
        <div className="mt-auto flex flex-col gap-3">
          <Link to="/planning" className={PRIMARY_BUTTON}>
            Voir le planning
          </Link>
          <Link to="/programmes" className={SECONDARY_BUTTON}>
            Voir mes programmes
          </Link>
        </div>
      </div>
    );
  }

  const sessions = program?.sessions ?? [];
  const canCreate = canActivateProgram(sessions);
  // The days of the week, in order, each one holding its sessions.
  const weekdays = [...new Set(sessions.map((session) => session.weekday))];

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <PageHeader onBack={() => setIsLeaving(true)} title="Nouveau programme" />

      <div className="flex flex-1 flex-col gap-2.5 px-[18px] pt-1 pb-32">
        <StepBar current={2} label="Séances" />
        {isLoading && <LoadingState label="Chargement du programme…" />}

        {!isLoading && error !== null && program === null && (
          <ErrorState
            title={error}
            message="Vérifie ta connexion internet, puis réessaie."
            onRetry={() => setAttempt((count) => count + 1)}
          />
        )}

        {!isLoading && program !== null && (
          <>
            <div className="flex flex-col gap-2.5 rounded-card bg-pick p-3.5 text-pick-content">
              <div className="flex flex-col gap-0.5">
                <b className="text-[15px] font-extrabold">{program.name}</b>
                <span className="text-xs font-medium leading-[1.45] text-pick-content/70">
                  {formatPeriodShort(program.start_date, program.end_date)}
                </span>
              </div>
              <Link
                to={`/programmes/${id}/informations`}
                // On the dark card the link stays light, to be readable (RM-064).
                className="self-start text-xs font-semibold text-pick-content underline"
              >
                Modifier les informations
              </Link>
              <dl className="grid grid-cols-3 gap-1.5">
                {[
                  {
                    key: "semaines",
                    value: countProgramWeeks(
                      program.start_date,
                      program.end_date,
                    ),
                    label: "semaines",
                  },
                  {
                    key: "jours",
                    value: new Set(sessions.map((item) => item.weekday)).size,
                    label: "jours / sem.",
                  },
                  {
                    key: "seances",
                    value: countProgramAppointments(
                      program.start_date,
                      program.end_date,
                      sessions,
                    ),
                    label: "séances",
                  },
                ].map((figure) => (
                  <div key={figure.key} className="flex flex-col gap-0.5">
                    <dd className="font-display text-[30px] font-extrabold uppercase italic leading-none">
                      {figure.value}
                    </dd>
                    <dt className="text-[11px] font-semibold leading-[1.45] text-pick-content/70">
                      {figure.label}
                    </dt>
                  </div>
                ))}
              </dl>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <h2 className="text-[20px] leading-none">
                Séances de la semaine
              </h2>
              <p
                aria-live="polite"
                className="shrink-0 text-[13px] font-extrabold text-muted"
              >
                {formatReadySessions(sessions)}
              </p>
            </div>

            {weekdays.map((weekday) => (
              <section
                key={weekday}
                aria-label={getWeekdayLabel(weekday)}
                className="flex flex-col gap-2"
              >
                <ul className="flex flex-col gap-2">
                  {sessions
                    .filter((session) => session.weekday === weekday)
                    .map((session) => (
                      <li
                        key={session.schedule_id}
                        className="flex items-stretch gap-2"
                      >
                        <Link
                          to={`/programmes/${id}/seances/${session.schedule_id}`}
                          className={`flex min-w-0 flex-1 flex-col gap-1.5 rounded-card border border-base-300 px-3.5 py-3 ${
                            session.exercise_count === 0
                              ? "bg-soft"
                              : "bg-base-100 shadow-card"
                          }`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-overline uppercase text-accent">
                              {getWeekdayLabel(session.weekday)}
                            </span>
                            <span className="shrink-0 text-xs font-semibold leading-[1.45] text-muted">
                              {session.planned_time ?? "sans heure"}
                            </span>
                          </span>
                          <span className="flex items-center justify-between gap-2">
                            <b className="truncate text-sm font-bold">
                              {session.name}
                            </b>
                            <Icon
                              src={chevronRightIcon}
                              className="size-[18px] shrink-0 text-faint"
                            />
                          </span>
                          <span className="line-clamp-2 text-xs font-medium leading-[1.45] text-muted">
                            {session.exercise_count === 0
                              ? "À configurer"
                              : session.exercise_names}
                          </span>
                        </Link>
                        {/* The last session of the week stays: a program
                            needs at least one (RM-027). */}
                        {sessions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSession(session)}
                            disabled={isSending}
                            aria-label={`Retirer la séance ${session.name}`}
                            className="grid w-12 shrink-0 place-items-center rounded-card border border-base-300 bg-base-100 text-status-missed shadow-card disabled:opacity-60"
                          >
                            <Icon src={trashIcon} className="size-[18px]" />
                          </button>
                        )}
                      </li>
                    ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setAddingOn(weekday)}
                  className="flex h-12 items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-dash text-sm font-bold text-secondary"
                >
                  <Icon src={plusIcon} className="size-[18px]" />
                  Autre séance le{" "}
                  {getWeekdayLabel(weekday).toLocaleLowerCase("fr-FR")}
                </button>
              </section>
            ))}

            {error !== null && (
              <p role="alert" className="font-semibold">
                {error}
              </p>
            )}
          </>
        )}
      </div>

      {!isLoading && program !== null && (
        <div className="fixed inset-x-0 bottom-0 px-[18px] pt-3 pb-1">
          <div className="mx-auto flex max-w-md flex-col gap-2">
            <div className="grid grid-cols-[1fr_1.4fr] gap-2.5">
              <Link to="/programmes" className={SECONDARY_BUTTON}>
                Enregistrer
                <span className="sr-only"> le brouillon</span>
              </Link>
              <button
                type="button"
                onClick={create}
                disabled={isSending || !canCreate}
                aria-describedby={canCreate ? undefined : "not-ready"}
                className={PRIMARY_BUTTON}
              >
                {isSending ? "Création…" : "Créer le programme"}
              </button>
            </div>
            {!canCreate && (
              <p id="not-ready" className="text-center text-xs text-muted">
                Chaque séance doit contenir au moins un exercice.
              </p>
            )}
          </div>
        </div>
      )}

      {addingOn !== null && program !== null && (
        <AddSessionOnDaySheet
          weekday={addingOn}
          sessions={sessions}
          addedLine={describeAddedSessions(
            program.start_date,
            program.end_date,
            sessions,
            addingOn,
          )}
          isSending={isSending}
          error={addError}
          onConfirm={addSession}
          onClose={() => {
            setAddingOn(null);
            setAddError(null);
          }}
        />
      )}

      {removed !== null && (
        <UndoToast
          message={`Séance « ${removed.name} » retirée.`}
          onUndo={undoRemove}
          onDismiss={() => setRemoved(null)}
        />
      )}

      {isLeaving && (
        // Screen PRO-03e: what happens to the program being built
        <ConfirmDialog
          title={`« ${program?.name ?? "Ce programme"} » n'est pas encore créé`}
          message="Enregistre-le en brouillon pour le reprendre plus tard : il n'apparaîtra pas dans le Planning."
          confirmLabel="Supprimer et quitter"
          cancelLabel="Continuer"
          onConfirm={removeDraft}
          onCancel={() => setIsLeaving(false)}
        />
      )}
    </div>
  );
}

export default ProgramSessionsPage;
