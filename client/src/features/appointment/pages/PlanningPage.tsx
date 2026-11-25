import { Link } from "react-router";
import {
  addDays,
  formatLongDate,
  formatSessionContent,
  todayInParis,
} from "shared";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import LoadingState from "../../../components/LoadingState";
import StatusBadge from "../../../components/StatusBadge";
import CreateSessionSheet from "../components/CreateSessionSheet";
import { useAppointments } from "../hooks/useAppointments";

const PRIMARY_LINK =
  "flex h-btn items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action";

// MVP planning (US-44): the coming sessions as a simple list, so they can be
// started and new ones created. The real calendar arrives with US-24.
function PlanningPage() {
  const today = todayInParis();
  const { items, isLoading, error, reload } = useAppointments(
    today,
    addDays(today, 30),
  );

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-display-md">Planning</h1>
        <CreateSessionSheet date={today} />
      </div>

      {isLoading && <LoadingState label="Chargement du planning…" />}

      {!isLoading && error !== null && (
        <ErrorState
          title="Impossible de charger ton planning."
          message="Vérifie ta connexion internet, puis réessaie."
          onRetry={reload}
        />
      )}

      {!isLoading && error === null && items.length === 0 && (
        <EmptyState
          title="Aucune séance à venir"
          message="Planifie une séance libre pour la retrouver ici."
        >
          <Link to="/seances/nouvelle" className={`${PRIMARY_LINK} w-full`}>
            Créer une séance
          </Link>
        </EmptyState>
      )}

      {!isLoading && error === null && items.length > 0 && (
        <>
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/seances/${item.id}`}
                  className="flex flex-col gap-1 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
                >
                  <span className="text-overline uppercase text-accent">
                    {formatLongDate(item.planned_date)} ·{" "}
                    {item.planned_time ?? "Sans heure"}
                  </span>
                  <span className="font-display text-display-sm">
                    {item.session_name}
                  </span>
                  <span className="flex items-center justify-between gap-2 text-sm text-muted">
                    {formatSessionContent(
                      item.block_count,
                      item.exercise_count,
                    )}
                    <StatusBadge status="planned" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/seances/nouvelle" className={PRIMARY_LINK}>
            Créer une séance
          </Link>
        </>
      )}
    </div>
  );
}

export default PlanningPage;
