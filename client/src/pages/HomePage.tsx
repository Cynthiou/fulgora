import { useState } from "react";
import { Link } from "react-router";
import {
  addDays,
  formatLongDate,
  sortDayAppointments,
  todayInParis,
} from "shared";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import QuickActions from "../components/QuickActions";
import CreateSessionSheet from "../features/appointment/components/CreateSessionSheet";
import TodaySelector from "../features/appointment/components/TodaySelector";
import TodaySessionCard from "../features/appointment/components/TodaySessionCard";
import { useAppointments } from "../features/appointment/hooks/useAppointments";
import ProgramsSummary from "../features/program/components/ProgramsSummary";
import { useCurrentWorkoutSession } from "../features/workout-session/hooks/useCurrentWorkoutSession";

const PRIMARY_LINK =
  "flex h-btn items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action";

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

// Screen 03: today's date, the session of the day, the programs, the shortcuts.
function HomePage() {
  const today = todayInParis();
  // One call for two months around today: today's sessions come from it, and
  // it tells whether the user already has any session at all.
  const appointments = useAppointments(addDays(today, -31), addDays(today, 30));
  const current = useCurrentWorkoutSession();
  const [chosenId, setChosenId] = useState<number | null>(null);

  const isLoading = appointments.isLoading || current.isLoading;
  const hasFailed = appointments.error !== null || current.error !== null;

  const todayItems = sortDayAppointments(
    appointments.items.filter((item) => item.planned_date === today),
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

  function retry() {
    appointments.reload();
    current.reload();
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-display-md">{formatLongDate(today)}</h1>
        <CreateSessionSheet date={today} />
      </div>

      {isLoading && <HomeSkeleton />}

      {!isLoading && hasFailed && (
        <ErrorState
          title="Impossible de charger tes séances"
          message="Vérifie ta connexion internet, puis réessaie."
          onRetry={retry}
        />
      )}

      {!isLoading && !hasFailed && (
        <>
          <section
            aria-labelledby="today-title"
            className="flex flex-col gap-3"
          >
            <h2
              id="today-title"
              className="font-sans text-overline not-italic uppercase text-accent"
            >
              Séance du jour
            </h2>
            {selected === undefined ? (
              <EmptyState
                title="Aucune séance prévue"
                message="Crée ta première séance : choisis tes blocs et tes exercices, puis lance-la quand tu veux."
              >
                <Link
                  to="/seances/nouvelle"
                  className={`${PRIMARY_LINK} w-full`}
                >
                  {hasAnySession
                    ? "Créer une séance"
                    : "Créer ma première séance"}
                </Link>
              </EmptyState>
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
                  currentSession={current.session}
                />
              </>
            )}
          </section>
          <ProgramsSummary />
        </>
      )}

      <QuickActions showCreate={!isEmptyToday} />
    </div>
  );
}

export default HomePage;
