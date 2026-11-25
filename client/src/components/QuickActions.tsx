import { Link } from "react-router";

type Props = {
  // Hidden when "Créer une séance" is already the main action of the page.
  showCreate: boolean;
};

const SECONDARY_LINK =
  "flex h-12 items-center justify-center rounded-btn border border-base-300 bg-base-100 font-semibold";

// Screen 03: the shortcuts at the bottom of the home page.
function QuickActions({ showCreate }: Props) {
  return (
    <section
      aria-labelledby="quick-actions-title"
      className="flex flex-col gap-3"
    >
      <h2
        id="quick-actions-title"
        className="font-sans text-overline not-italic uppercase text-accent"
      >
        Actions rapides
      </h2>
      <ul className="flex flex-col gap-2">
        {showCreate && (
          <li>
            <Link to="/seances/nouvelle" className={SECONDARY_LINK}>
              Créer une séance
            </Link>
          </li>
        )}
        <li>
          <Link to="/planning" className={SECONDARY_LINK}>
            Voir mon planning
          </Link>
        </li>
        <li>
          <Link to="/suivi" className={SECONDARY_LINK}>
            Voir mon historique
          </Link>
        </li>
      </ul>
    </section>
  );
}

export default QuickActions;
