import { Link, Outlet, useLocation } from "react-router";
import { getInitials } from "shared";
import boltIcon from "../assets/icons/ui/app/bolt.svg";
import NotificationBell from "../features/notification/components/NotificationBell";
import { useUnreadCount } from "../features/notification/hooks/useUnreadCount";
import { useAuth } from "../hooks/useAuth";
import Icon from "./Icon";
import TabBar from "./TabBar";

// The shell of the four main pages: header (lightning, FULGORA, bell,
// avatar), content, tabs. The avatar opens the profile and remembers the
// tab to come back to; the bell leads to the notifications (D-01, US-46).
// The header is 58 px tall, as the high fidelity mockups draw it.
function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const unreadCount = useUnreadCount();

  return (
    <div className="flex min-h-screen flex-col bg-base-200 pb-[calc(var(--spacing-nav)+env(safe-area-inset-bottom))] text-base-content">
      <header className="sticky top-0 z-10 flex h-[58px] items-center gap-1 bg-base-200 pr-[14px] pl-[22px]">
        <span className="flex flex-1 items-center gap-2">
          <Icon
            src={boltIcon}
            className="size-6 shrink-0 text-secondary theme-dark:text-secondary"
          />
          <span className="font-display text-[26px] font-extrabold uppercase italic leading-none tracking-[0.1em]">
            Fulgora
          </span>
        </span>
        {user !== null && (
          <>
            <NotificationBell unreadCount={unreadCount} />
            {/* Read as "LM, mon profil": the initials stay part of the name. */}
            <Link
              to="/profil"
              state={{ from: location.pathname }}
              className="flex size-tap items-center justify-center"
            >
              <span className="grid size-[38px] place-items-center rounded-full bg-neutral text-xs font-bold text-neutral-content">
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
