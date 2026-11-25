import { Link } from "react-router";
import plusIcon from "../assets/icons/ui/actions/plus.svg";
import calendarIcon from "../assets/icons/ui/navigation/calendar-month.svg";
import historyIcon from "../assets/icons/ui/navigation/history.svg";
import Icon from "./Icon";

type Props = {
  // Hidden when "Créer une séance" is already the main action of the page.
  showCreate: boolean;
};

const CARD =
  "flex h-full flex-col gap-2 border-base-300 p-3 text-sm font-semibold";

// Screen 03: the shortcuts at the bottom of the home page, side by side in a
// bordered grid, as on the wireframe.
function QuickActions({ showCreate }: Props) {
  return (
    <section
      aria-labelledby="quick-actions-title"
      className="flex flex-col gap-3"
    >
      <h2 id="quick-actions-title" className="text-display-sm">
        Actions rapides
      </h2>
      <ul
        className={`grid divide-x divide-base-300 overflow-hidden rounded-card border border-base-300 bg-base-100 shadow-card ${
          showCreate ? "grid-cols-3" : "grid-cols-2"
        }`}
      >
        {showCreate && (
          <li>
            <Link to="/seances/nouvelle" className={CARD}>
              <Icon src={plusIcon} className="size-5 text-secondary" />
              Créer une séance
            </Link>
          </li>
        )}
        <li>
          <Link to="/planning" className={CARD}>
            <Icon src={calendarIcon} className="size-5 text-secondary" />
            Voir mon planning
          </Link>
        </li>
        <li>
          <Link to="/suivi" className={CARD}>
            <Icon src={historyIcon} className="size-5 text-secondary" />
            Voir mon historique
          </Link>
        </li>
      </ul>
    </section>
  );
}

export default QuickActions;
