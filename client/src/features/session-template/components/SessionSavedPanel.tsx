import { Link } from "react-router";
import { formatLongDate, formatSessionContent } from "shared";
import checkIcon from "../../../assets/icons/ui/app/check.svg";
import Icon from "../../../components/Icon";
import StatusBadge from "../../../components/StatusBadge";

type Props = {
  name: string;
  plannedDate: string;
  plannedTime: string | null;
  blockCount: number;
  exerciseCount: number;
};

const PRIMARY_LINK =
  "flex h-btn w-full items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action";

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
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-3.5 px-[18px] pt-3 pb-4">
      <h1 className="text-display-page">Séance enregistrée</h1>

      <div className="flex flex-col gap-2 rounded-card border border-base-300 bg-base-100 p-4 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <span className="font-sans text-overline uppercase not-italic text-accent">
            {formatLongDate(plannedDate)}
            {plannedTime === null ? "" : ` · ${plannedTime}`}
          </span>
          <StatusBadge status="planned" />
        </div>
        <p className="font-display text-display-sm">{name}</p>
        <p className="text-xs font-medium leading-[1.45] text-muted">
          {formatSessionContent(blockCount, exerciseCount)} · Séance libre
        </p>
      </div>

      {/* The dark message of the mockup (A9), here under the card. */}
      <p
        role="status"
        className="flex items-center gap-2.5 rounded-card bg-pick px-4 py-3.5 text-sm font-semibold text-pick-content shadow-hero"
      >
        <Icon
          src={checkIcon}
          className="size-[18px] shrink-0 text-status-done"
        />
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
          className="flex h-13 items-center justify-center rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}

export default SessionSavedPanel;
