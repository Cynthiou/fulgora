import { useState } from "react";
import { Link } from "react-router";
import {
  addDays,
  formatLongDate,
  formatTodayCount,
  getAppointmentDisplayDate,
  sortDayAppointments,
  todayInParis,
} from "shared";
import calendarIcon from "../assets/icons/ui/app/calendar.svg";
import alertCircleIcon from "../assets/icons/ui/states/alert-circle.svg";
import Icon from "../components/Icon";
import QuickActions from "../components/QuickActions";
import TodaySelector from "../features/appointment/components/TodaySelector";
import TodaySessionCard from "../features/appointment/components/TodaySessionCard";
import { useAppointment } from "../features/appointment/hooks/useAppointment";
import { useAppointments } from "../features/appointment/hooks/useAppointments";
import ProgramsSummary from "../features/program/components/ProgramsSummary";
import { useCurrentWorkoutSession } from "../features/workout-session/hooks/useCurrentWorkoutSession";
import { useAuth } from "../hooks/useAuth";

const PRIMARY_LINK =
  "flex h-btn w-full items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action";

// Grey blocks where the content will land; the structure does not move.
function HomeSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Chargement de l'accueil</span>
      <div className="h-4 w-32 animate-pulse rounded-chip bg-soft motion-reduce:animate-none" />
      <div className="h-44 animate-pulse rounded-card bg-soft motion-reduce:animate-none" />
      <div className="h-4 w-32 animate-pulse rounded-chip bg-soft motion-reduce:animate-none" />
      <div className="h-20 animate-pulse rounded-card bg-soft motion-reduce:animate-none" />
    </div>
  );
}

// Screen 03: the date, the session of the day, the programs, the shortcuts.
function HomePage() {
  const { user } = useAuth();
  const today = todayInParis();
  // One call for two months around today: today's sessions come from it, and
  // it tells whether the user already has any session at all.
  const appointments = useAppointments(addDays(today, -31), addDays(today, 30));
  const current = useCurrentWorkoutSession();
  const [chosenId, setChosenId] = useState<number | null>(null);

  const isLoading = appointments.isLoading || current.isLoading;
  const hasFailed = appointments.error !== null || current.error !== null;

  // A session done another day belongs to that day, not to today (RM-070).
  const todayItems = sortDayAppointments(
    appointments.items.filter(
      (item) => getAppointmentDisplayDate(item) === today,
    ),
  );
  const hasAnySession = appointments.items.length > 0;

  // The session in progress comes first, whatever its time (RM-040).
  const inProgress = todayItems.find(
    (item) =>
      current.session !== null &&
      item.workout_session?.id === current.session.id,
  );
  const selected =
    todayItems.find((item) => item.id === chosenId) ??
    inProgress ??
    todayItems[0];

  const isEmptyToday = !isLoading && !hasFailed && todayItems.length === 0;
  // The detail gives the exercises of the card of the day (03-2).
  const detail = useAppointment(selected?.id ?? 0);

  function retry() {
    appointments.reload();
    current.reload();
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-2.5 px-5 pb-8 pt-0.5">
      {/* Screen 03-2: the day in small teal letters, then the greeting. */}
      <div className="flex items-end justify-between gap-3 pt-0.5">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate font-sans text-overline uppercase text-accent">
            {formatLongDate(today)}
          </p>
          <h1 className="truncate text-display-md">
            Salut {user?.username ?? ""}
          </h1>
        </div>
        {todayItems.length > 0 && (
          <Link
            to={`/planning?vue=jour&jour=${today}`}
            className="shrink-0 text-[13px] font-semibold text-secondary"
          >
            {formatTodayCount(todayItems.length)} ›
          </Link>
        )}
      </div>

      {isLoading && <HomeSkeleton />}

      {!isLoading && hasFailed && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
        >
          <p className="flex items-center gap-2 font-semibold">
            <Icon
              src={alertCircleIcon}
              className="size-6 shrink-0 text-status-missed"
            />
            Impossible de charger tes séances
          </p>
          <p className="text-muted">
            Vérifie ta connexion internet, puis réessaie.
          </p>
          <button type="button" onClick={retry} className={PRIMARY_LINK}>
            Réessayer
          </button>
        </div>
      )}

      {!isLoading && !hasFailed && (
        <>
          {selected === undefined ? (
            <section
              aria-labelledby="today-title"
              className="flex flex-col gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
            >
              <h2
                id="today-title"
                className="font-sans text-overline not-italic uppercase text-accent"
              >
                Séance du jour
              </h2>
              <div className="flex flex-col items-start gap-2.5 py-1.5">
                <span
                  aria-hidden="true"
                  className="grid size-[52px] place-items-center rounded-hero bg-secondary/10 text-secondary"
                >
                  <Icon src={calendarIcon} className="size-6" />
                </span>
                <p className="font-display text-[26px] font-extrabold uppercase italic leading-none">
                  Aucune séance prévue
                </p>
                <p className="text-sm leading-[1.45] text-muted">
                  Crée ta première séance : choisis tes blocs et tes exercices,
                  puis lance-la quand tu veux.
                </p>
              </div>
              <Link to="/seances/nouvelle" className={PRIMARY_LINK}>
                {hasAnySession
                  ? "Créer une séance"
                  : "Créer ma première séance"}
              </Link>
            </section>
          ) : (
            <>
              {todayItems.length > 1 && (
                <TodaySelector
                  items={todayItems}
                  selectedId={selected.id}
                  onSelect={setChosenId}
                />
              )}
              <TodaySessionCard
                appointment={selected}
                detail={
                  detail.appointment?.id === selected.id
                    ? detail.appointment
                    : null
                }
                currentSession={current.session}
              />
            </>
          )}
          <ProgramsSummary />
        </>
      )}

      <QuickActions showCreate={!isEmptyToday} />
    </div>
  );
}

export default HomePage;
