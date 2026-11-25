import { Link } from "react-router";
import { formatLongDate, formatSessionContent } from "shared";
import StatusBadge from "../../../components/StatusBadge";

type Props = {
  name: string;
  plannedDate: string;
  plannedTime: string | null;
  blockCount: number;
  exerciseCount: number;
};

const PRIMARY_LINK =
  "flex h-btn w-full items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action";

// Screen A9: the session is saved and planned. The way out leads to the
// Planning or to the home page, where the session now shows on its day.
function SessionSavedPanel({
  name,
  plannedDate,
  plannedTime,
  blockCount,
  exerciseCount,
}: Props) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-4">
      <h1 className="text-display-md">Séance enregistrée</h1>

      <div className="flex flex-col gap-2 rounded-card border border-base-300 bg-base-100 p-4 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <span className="text-overline uppercase text-accent">
            {formatLongDate(plannedDate)}
            {plannedTime === null ? "" : ` · ${plannedTime}`}
          </span>
          <StatusBadge status="planned" />
        </div>
        <p className="font-display text-display-sm">{name}</p>
        <p className="text-sm text-muted">
          {formatSessionContent(blockCount, exerciseCount)} · Séance libre
        </p>
      </div>

      <p role="status" className="flex gap-2 font-semibold">
        <span aria-hidden="true" className="text-status-done">
          ✓
        </span>
        Séance enregistrée le{" "}
        {formatLongDate(plannedDate).charAt(0).toLowerCase() +
          formatLongDate(plannedDate).slice(1)}
        .
      </p>

      <div className="mt-auto flex flex-col gap-3">
        <Link to="/planning" className={PRIMARY_LINK}>
          Voir le planning
        </Link>
        <Link
          to="/"
          className="flex h-12 items-center justify-center rounded-btn border border-base-300 bg-base-100 font-semibold"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}

export default SessionSavedPanel;
