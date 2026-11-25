import { Link, Outlet, useLocation } from "react-router";
import { getInitials } from "shared";
import logoDarkBg from "../assets/logo/fulgora-logo-dark-bg.svg";
import logoLightBg from "../assets/logo/fulgora-logo-light-bg.svg";
import NotificationBell from "../features/notification/components/NotificationBell";
import { useUnreadCount } from "../features/notification/hooks/useUnreadCount";
import { useAuth } from "../hooks/useAuth";
import TabBar from "./TabBar";

// The shell of the four main pages: header (logo, bell, avatar), content,
// tabs. The avatar opens the profile and remembers the tab to come back to;
// the bell leads to the notifications (D-01, US-46).
function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const unreadCount = useUnreadCount();

  return (
    <div className="flex min-h-screen flex-col bg-base-200 pb-[calc(var(--spacing-nav)+env(safe-area-inset-bottom))] text-base-content">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-base-300 bg-base-100 px-4">
        {/* One logo per theme: the dark letters would vanish on a dark header. */}
        <img
          src={logoLightBg}
          alt="Fulgora"
          className="h-8 w-auto theme-dark:hidden"
        />
        <img
          src={logoDarkBg}
          alt=""
          aria-hidden="true"
          className="hidden h-8 w-auto theme-dark:block"
        />
        {user !== null && (
          <div className="flex items-center gap-1">
            <NotificationBell unreadCount={unreadCount} />
            {/* Read as "LM, mon profil": the initials stay part of the name. */}
            <Link
              to="/profil"
              state={{ from: location.pathname }}
              className="flex size-tap items-center justify-center"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-secondary font-display text-base font-extrabold text-secondary-content">
                {getInitials(user.username)}
              </span>
              <span className="sr-only">, mon profil</span>
            </Link>
          </div>
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
