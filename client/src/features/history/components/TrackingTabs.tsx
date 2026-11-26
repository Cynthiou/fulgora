import { Link } from "react-router";

type Props = {
  current: "resume" | "historique" | "exercices";
};

// The three tabs of the Suivi (SUI-01, SUI-05, SUI-08).
const TABS = [
  { key: "resume", label: "Résumé", to: "/suivi" },
  { key: "historique", label: "Historique", to: "/suivi/historique" },
  { key: "exercices", label: "Exercices", to: "/suivi/exercices" },
] as const;

function TrackingTabs({ current }: Props) {
  return (
    <nav aria-label="Vues du suivi">
      <ul className="flex gap-2">
        {TABS.map((tab) => (
          <li key={tab.key}>
            <Link
              to={tab.to}
              aria-current={tab.key === current ? "page" : undefined}
              className={`flex h-9 items-center rounded-chip px-3.5 text-[13px] font-bold ${
                tab.key === current
                  ? "bg-pick text-pick-content"
                  : "border border-base-300 bg-base-100 shadow-card"
              }`}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default TrackingTabs;
