import { Link, Outlet, useLocation } from "react-router";
import { getInitials } from "shared";
import boltIcon from "../assets/icons/ui/app/bolt.svg";
import NotificationBell from "../features/notification/components/NotificationBell";
import { useUnreadCount } from "../features/notification/hooks/useUnreadCount";
import { useAuth } from "../hooks/useAuth";
import Icon from "./Icon";
import TabBar from "./TabBar";

// What the header of each tab shows (the mockups 03-2, 04-1, CAL-01,
// SUI-01): the logo on the home page, the name of the page elsewhere, and
// for the Planning a link to the programs instead of the bell.
const HEADERS: Record<
  string,
  { title: string | null; action?: { label: string; to: string } }
> = {
  "/": { title: null },
  "/planning": {
    title: "Planning",
    action: { label: "Mes programmes", to: "/programmes" },
  },
  "/suivi": { title: "Suivi" },
  "/catalogue": { title: "Catalogue" },
};

// The shell of the four main pages: header, content, tabs. The avatar opens
// the profile and remembers the tab to come back to; the bell leads to the
// notifications (D-01, US-46). The header is 58 px tall.
function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const unreadCount = useUnreadCount();
  const header = HEADERS[location.pathname] ?? { title: null };

  return (
    <div className="flex min-h-screen flex-col bg-base-200 pb-[calc(var(--spacing-nav)+env(safe-area-inset-bottom))] text-base-content">
      <header className="sticky top-0 z-10 flex h-[58px] items-center gap-1 bg-base-200 pr-[14px] pl-[22px]">
        {header.title === null ? (
          <span className="flex flex-1 items-center gap-2">
            <Icon src={boltIcon} className="size-6 shrink-0 text-secondary" />
            <span className="font-display text-[26px] font-extrabold uppercase italic leading-none tracking-[0.1em]">
              Fulgora
            </span>
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate font-display text-[30px] font-extrabold uppercase italic leading-none">
            {header.title}
          </span>
        )}
        {user !== null && (
          <>
            {header.action === undefined ? (
              <NotificationBell unreadCount={unreadCount} />
            ) : (
              <Link
                to={header.action.to}
                className="mr-1.5 flex min-h-tap items-center text-[13px] font-semibold text-secondary"
              >
                {header.action.label}
              </Link>
            )}
            {/* Read as "LM, mon profil": the initials stay part of the name. */}
            <Link
              to="/profil"
              state={{ from: location.pathname }}
              className="flex size-tap items-center justify-center"
            >
              <span className="grid size-[38px] place-items-center rounded-full bg-pick text-xs font-bold text-pick-content">
                {getInitials(user.username)}
              </span>
              <span className="sr-only">, mon profil</span>
            </Link>
          </>
        )}
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}

export default AppLayout;
