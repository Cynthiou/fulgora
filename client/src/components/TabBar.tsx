import { NavLink } from "react-router";
import calendarIcon from "../assets/icons/ui/app/calendar.svg";
import chartIcon from "../assets/icons/ui/app/chart.svg";
import gridIcon from "../assets/icons/ui/app/grid.svg";
import homeIcon from "../assets/icons/ui/app/home.svg";
import Icon from "./Icon";

// The four tabs (RM-066). The profile is reached by the avatar, never a 5th tab.
const TABS = [
  { to: "/", label: "Accueil", icon: homeIcon, end: true },
  { to: "/planning", label: "Planning", icon: calendarIcon, end: false },
  { to: "/suivi", label: "Suivi", icon: chartIcon, end: false },
  { to: "/catalogue", label: "Catalogue", icon: gridIcon, end: false },
];

// Fixed at the bottom, 62 px tall plus the safe area of the phone. The
// active tab is raised in a blue bubble of 52 px, written in bold and in
// blue: never the colour alone. NavLink sets aria-current="page" by itself.
function TabBar() {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-base-300 bg-base-100 shadow-card pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid h-nav max-w-md grid-cols-4">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex items-stretch">
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex min-h-tap flex-1 flex-col items-center justify-center gap-1 text-[10.5px] ${
                  isActive
                    ? "font-extrabold text-secondary"
                    : "font-semibold text-muted"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span className="-mb-4 grid size-nav-fab -translate-y-[18px] place-items-center rounded-full bg-secondary text-secondary-content shadow-nav-active ring-6 ring-base-200">
                      <Icon src={tab.icon} className="size-[22px]" />
                    </span>
                  ) : (
                    // The icon keeps the lighter grey of the mockup; the
                    // label is one step darker so the contrast holds.
                    <Icon src={tab.icon} className="size-[22px] text-faint" />
                  )}
                  {tab.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default TabBar;
