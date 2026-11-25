import { Link } from "react-router";
import calendarIcon from "../assets/icons/ui/app/calendar.svg";
import historyIcon from "../assets/icons/ui/app/history.svg";
import plusIcon from "../assets/icons/ui/app/plus.svg";
import Icon from "./Icon";

type Props = {
  // Hidden when "Créer une séance" is already the main action of the page.
  showCreate: boolean;
};

const CARD =
  "flex h-[60px] flex-col items-center justify-center gap-2 rounded-card border border-base-300 bg-base-100 text-center text-xs font-semibold shadow-card";
const ICON_BOX =
  "grid size-8 place-items-center rounded-[7px] bg-secondary/10 text-secondary";

// Screen 03-2: three square shortcuts at the bottom of the home page, each
// with its icon in a tinted box, as the high fidelity mockup draws them.
function QuickActions({ showCreate }: Props) {
  return (
    <ul
      aria-label="Actions rapides"
      className={`grid gap-2 ${showCreate ? "grid-cols-3" : "grid-cols-2"}`}
    >
      {showCreate && (
        <li className="flex">
          <Link to="/seances/nouvelle" className={`${CARD} flex-1`}>
            <span aria-hidden="true" className={ICON_BOX}>
              <Icon src={plusIcon} className="size-5" />
            </span>
            Créer une séance
          </Link>
        </li>
      )}
      <li className="flex">
        <Link to="/planning" className={`${CARD} flex-1`}>
          <span aria-hidden="true" className={ICON_BOX}>
            <Icon src={calendarIcon} className="size-5" />
          </span>
          Mon planning
        </Link>
      </li>
      <li className="flex">
        <Link to="/suivi" className={`${CARD} flex-1`}>
          <span aria-hidden="true" className={ICON_BOX}>
            <Icon src={historyIcon} className="size-5" />
          </span>
          Historique
        </Link>
      </li>
    </ul>
  );
}

export default QuickActions;
