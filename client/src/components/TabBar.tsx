import { NavLink } from "react-router";
import barbellIcon from "../assets/icons/ui/navigation/barbell.svg";
import calendarIcon from "../assets/icons/ui/navigation/calendar-month.svg";
import historyIcon from "../assets/icons/ui/navigation/history.svg";
import homeIcon from "../assets/icons/ui/navigation/home.svg";
import Icon from "./Icon";

// The four tabs (RM-066). The profile is reached by the avatar, never a 5th tab.
const TABS = [
  { to: "/", label: "Accueil", icon: homeIcon, end: true },
  { to: "/planning", label: "Planning", icon: calendarIcon, end: false },
  { to: "/suivi", label: "Suivi", icon: historyIcon, end: false },
  { to: "/catalogue", label: "Catalogue", icon: barbellIcon, end: false },
];

// Fixed at the bottom, h-nav tall plus the safe area of the phone, so the
// labels are never cut. NavLink sets aria-current="page" on the active tab by
// itself; the active tab is also raised in a round bubble and written in bold,
// so it is never told by the color alone.
function TabBar() {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-base-300 bg-base-100 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid h-nav max-w-md grid-cols-4">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex items-stretch">
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex min-h-tap flex-1 flex-col items-center justify-center gap-1 text-xs ${
                  isActive
                    ? "font-bold text-secondary"
                    : "font-semibold text-muted"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={
                      isActive
                        ? "flex size-nav-fab -translate-y-[22px] items-center justify-center rounded-full bg-secondary text-secondary-content shadow-nav-active ring-[6px] ring-base-200 transition-all duration-[400ms] ease-bounce motion-reduce:transition-none"
                        : "flex size-6 items-center justify-center"
                    }
                  >
                    <Icon src={tab.icon} className="size-6" />
                  </span>
                  <span className={isActive ? "-translate-y-6" : ""}>
                    {tab.label}
                  </span>
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
