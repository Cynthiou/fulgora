import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  computeProgramProgress,
  formatLongDate,
  formatPeriodShort,
  formatProgramProgress,
  formatProgramReview,
  formatWeekdays,
  getAppointmentStatus,
  getAvailableProgramActions,
  getProgramWeekIndex,
  groupProgramWeeks,
  isWorkoutOver,
  PROGRAM_STATUS_LABELS,
  type ProgramDetailFull,
  type ProgramStatus,
  todayInParis,
} from "shared";
import dotsIcon from "../../../assets/icons/ui/app/dots.svg";
import playIcon from "../../../assets/icons/ui/app/play.svg";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
import LoadingState from "../../../components/LoadingState";
import PageHeader from "../../../components/PageHeader";
import { isAbortError } from "../../../services/api";
import { ApiError } from "../../../services/apiError";
import { useStartWorkout } from "../../workout-session/hooks/useStartWorkout";
import ProgramActionsSheet from "../components/ProgramActionsSheet";
import ProgramSessionRow from "../components/ProgramSessionRow";
import ProgramWeekGrid from "../components/ProgramWeekGrid";
import { readProgram } from "../services/programService";

const PRIMARY_BUTTON =
  "flex h-btn w-full items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60";

// The chip of each state, as on the list (PRO-01, PRO-07).
const STATUS_CHIP: Record<ProgramStatus, string> = {
  draft: "bg-neutral/[0.06] text-muted",
  programmed: "bg-secondary/10 text-secondary",
  in_progress: "bg-primary/10 text-action-text",
  finished: "bg-status-done/10 text-status-done-text",
  abandoned: "bg-status-cancelled/10 text-status-cancelled-text",
};

// How many days before the program starts ("Commence dans 4 jours").
function countDaysUntil(start: string, today: string): number {
  const from = Date.parse(`${today}T00:00:00Z`);
  const to = Date.parse(`${start}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

// Screens PRO-07, PRO-07c and PRO-13: one program, in three faces. Coming:
// when it starts and its first session. Running: the week, the progress,
// the session of the day and what comes next. Over: the review and the
// last sessions (US-48).
function ProgramDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const navigate = useNavigate();
  const today = todayInParis();
  const [program, setProgram] = useState<ProgramDetailFull | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const start = useStartWorkout();

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is listed on purpose, it re-runs the load
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    setNotFound(false);
    readProgram(id, controller.signal)
      .then((data) => {
        setProgram(data);
        setIsLoading(false);
      })
      .catch((caught: unknown) => {
        if (isAbortError(caught)) {
          return;
        }
        if (caught instanceof ApiError && caught.status === 404) {
          setNotFound(true);
        } else {
          setError("Impossible de charger ce programme.");
        }
        setIsLoading(false);
      });
    return () => controller.abort();
  }, [id, attempt]);

  const appointments = program?.appointments ?? [];
  const progress = computeProgramProgress(appointments, today);
  const weeks =
    program === null ? [] : groupProgramWeeks(program, appointments, today);
  const weekIndex =
    program === null ? null : getProgramWeekIndex(program, today);
  const running = appointments.find(
    (item) =>
      item.workout_session !== null &&
      item.workout_session.status === "in_progress",
  );
  const actions = getAvailableProgramActions(
    { status: program?.status ?? "draft" },
    running !== undefined,
  );

  // The session of the day that can still be started (RM-069).
  const todaySession = appointments.find(
    (item) =>
      item.planned_date === today &&
      !isWorkoutOver(item) &&
      item.status !== "cancelled",
  );
  const next = appointments
    .filter(
      (item) =>
        item.planned_date > today &&
        !isWorkoutOver(item) &&
        item.status !== "cancelled",
    )
    .slice(0, 3);
  const past = appointments
    .filter((item) => isWorkoutOver(item) || item.planned_date < today)
    .slice(-3)
    .reverse();
  const isOver =
    program?.status === "finished" || program?.status === "abandoned";
  const cancelled = appointments.filter(
    (item) => getAppointmentStatus(item) === "cancelled",
  ).length;
  const missed = appointments.filter(
    (item) => getAppointmentStatus(item) === "missed",
  ).length;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <PageHeader
        onBack={() => navigate("/programmes")}
        backLabel="Retour à mes programmes"
        title={program?.name ?? "Programme"}
        subtitle={
          program === null
            ? undefined
            : `${formatPeriodShort(program.start_date, program.end_date)} · ${formatWeekdays(
                program.sessions.map((session) => session.weekday),
              )}`
        }
        action={
          program === null ? undefined : (
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              aria-haspopup="dialog"
              aria-label="Actions du programme"
              className="grid size-tap shrink-0 place-items-center rounded-btn text-muted"
            >
              <Icon src={dotsIcon} className="size-[22px]" />
            </button>
          )
        }
      />

      <div className="flex flex-1 flex-col gap-2.5 px-[18px] pt-1 pb-4">
        {isLoading && <LoadingState label="Chargement du programme…" />}

        {!isLoading && notFound && (
          <EmptyState
            centered
            title="Programme introuvable"
            message="Il n'existe pas, ou il ne t'appartient pas."
          >
            <Link to="/programmes" className={`${PRIMARY_BUTTON} no-underline`}>
              Voir mes programmes
            </Link>
          </EmptyState>
        )}

        {!isLoading && !notFound && error !== null && (
          <ErrorState
            title={error}
            message="Vérifie ta connexion internet, puis réessaie."
            onRetry={() => setAttempt((count) => count + 1)}
          />
        )}

        {!isLoading && program !== null && error === null && !notFound && (
          <>
            <div className="flex flex-col items-start gap-1.5">
              <span
                className={`rounded-chip px-2 py-[3px] text-[10px] font-extrabold uppercase tracking-[0.06em] ${
                  STATUS_CHIP[program.status]
                }`}
              >
                {PROGRAM_STATUS_LABELS[program.status]}
              </span>

              {isOver ? (
                <h2 className="text-display-md">
                  Programme{" "}
                  {program.status === "finished" ? "terminé" : "abandonné"}
                </h2>
              ) : program.status === "programmed" ? (
                <>
                  <h2 className="text-display-md">
                    {countDaysUntil(program.start_date, today) <= 0
                      ? "Commence aujourd'hui"
                      : `Commence dans ${countDaysUntil(
                          program.start_date,
                          today,
                        )} jours`}
                  </h2>
                  <p className="text-[13px] font-medium text-muted">
                    {formatLongDate(program.start_date)}
                  </p>
                </>
              ) : (
                <>
                  <p className="flex items-baseline gap-2">
                    <span className="font-display text-[36px] font-extrabold uppercase italic leading-none">
                      Semaine {weekIndex ?? 1}
                    </span>
                    <span className="text-sm font-semibold leading-[1.45] text-muted">
                      sur {weeks.length}
                    </span>
                  </p>
                  <p className="text-[13px] font-semibold leading-[1.45] text-muted">
                    {formatProgramProgress(progress)}
                  </p>
                </>
              )}
            </div>

            {isOver ? (
              <>
                {/* PRO-13: what the program leaves behind */}
                <dl className="grid grid-cols-3 gap-2">
                  {[
                    {
                      key: "done",
                      value: progress.done,
                      label: "effectuées",
                      tone: "text-status-done-text",
                    },
                    {
                      key: "missed",
                      value: missed,
                      label: missed > 1 ? "manquées" : "manquée",
                      tone: "text-status-missed-text",
                    },
                    {
                      key: "cancelled",
                      value: cancelled,
                      label: cancelled > 1 ? "annulées" : "annulée",
                      tone: "text-status-cancelled-text",
                    },
                  ].map((figure) => (
                    <div
                      key={figure.key}
                      className="flex flex-col gap-1 rounded-card border border-base-300 bg-base-100 p-3 shadow-card"
                    >
                      <dd
                        className={`font-display text-[30px] font-extrabold uppercase italic leading-none ${figure.tone}`}
                      >
                        {figure.value}
                      </dd>
                      <dt className="text-xs font-medium text-muted">
                        {figure.label}
                      </dt>
                    </div>
                  ))}
                </dl>

                <section
                  aria-labelledby="review-title"
                  className="flex flex-col gap-2 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
                >
                  <h2
                    id="review-title"
                    className="font-sans text-overline uppercase not-italic text-accent"
                  >
                    Résumé
                  </h2>
                  <p className="text-sm">{formatProgramReview(progress)}</p>
                  <p className="text-sm text-muted">
                    {formatPeriodShort(program.start_date, program.end_date)}
                  </p>
                </section>
              </>
            ) : (
              <ProgramWeekGrid weeks={weeks} />
            )}

            {/* PRO-07: the session of the day, the only one with a start */}
            {!isOver && todaySession !== undefined && (
              <section
                aria-labelledby="today-title"
                className="flex flex-col gap-2 rounded-hero border-[1.5px] border-secondary bg-base-100 p-3.5"
              >
                <h2
                  id="today-title"
                  className="font-sans text-overline uppercase not-italic text-accent"
                >
                  Aujourd'hui
                  {todaySession.planned_time === null
                    ? ""
                    : ` · ${todaySession.planned_time}`}
                  {weekIndex === null ? "" : ` · S${weekIndex}/${weeks.length}`}
                </h2>
                <p className="text-[20px] font-extrabold">
                  {todaySession.session_name}
                </p>
                <p className="text-xs font-medium leading-[1.45] text-muted">
                  {todaySession.exercise_count} exercice
                  {todaySession.exercise_count > 1 ? "s" : ""}
                </p>
                {start.error !== null && <ErrorState title={start.error} />}
                {running === undefined ? (
                  <button
                    type="button"
                    disabled={
                      start.isStarting || todaySession.exercise_count === 0
                    }
                    onClick={() => start.start(todaySession.id)}
                    className={PRIMARY_BUTTON}
                  >
                    <Icon src={playIcon} className="size-[18px]" />
                    {start.isStarting ? "Démarrage…" : "Démarrer la séance"}
                  </button>
                ) : (
                  <p className="text-center text-sm font-semibold text-muted">
                    Une séance est en cours
                  </p>
                )}
              </section>
            )}

            {/* PRO-07c: the first session of a program still to come */}
            {program.status === "programmed" && next.length > 0 && (
              <section
                aria-labelledby="first-title"
                className="flex flex-col gap-1.5 rounded-card border border-base-300 bg-base-100 p-3.5 shadow-card"
              >
                <h2
                  id="first-title"
                  className="font-sans text-overline uppercase not-italic text-accent"
                >
                  Première séance ·{" "}
                  {formatLongDate(next[0]?.planned_date ?? program.start_date)}
                  {next[0]?.planned_time === null
                    ? ""
                    : ` · ${next[0]?.planned_time}`}
                </h2>
                <p className="text-[20px] font-extrabold">
                  {next[0]?.session_name}
                </p>
                <p className="text-xs font-medium leading-[1.45] text-muted">
                  {next[0]?.exercise_count} exercice
                  {(next[0]?.exercise_count ?? 0) > 1 ? "s" : ""}
                </p>
              </section>
            )}

            {!isOver && next.length > 0 && (
              <section
                aria-labelledby="next-title"
                className="flex flex-col gap-2"
              >
                <h2
                  id="next-title"
                  className="font-sans text-overline uppercase not-italic text-muted"
                >
                  Ensuite
                </h2>
                <ul className="flex flex-col gap-2">
                  {next.map((item) => (
                    <ProgramSessionRow key={item.id} item={item} />
                  ))}
                </ul>
              </section>
            )}

            {past.length > 0 && (
              <section
                aria-labelledby="past-title"
                className="flex flex-col gap-2"
              >
                <h2
                  id="past-title"
                  className="font-sans text-overline uppercase not-italic text-muted"
                >
                  {isOver ? "Dernières séances" : "Déjà passées"}
                </h2>
                <ul className="flex flex-col gap-2">
                  {past.map((item) => (
                    <ProgramSessionRow key={item.id} item={item} withStatus />
                  ))}
                </ul>
                <Link
                  to="/suivi"
                  className="min-h-tap self-start text-[13px] font-semibold text-secondary"
                >
                  Voir l'historique
                </Link>
              </section>
            )}

            {appointments.length === 0 && (
              <p className="text-sm text-muted">
                Ce programme n'a pas encore de séance dans le Planning.
              </p>
            )}
          </>
        )}
      </div>

      {isMenuOpen && (
        <ProgramActionsSheet
          actions={actions}
          onClose={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  );
}

export default ProgramDetailPage;
