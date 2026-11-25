import { Link, Outlet, useLocation } from "react-router";
import { getInitials } from "shared";
import logo from "../assets/logo/fulgora-logo-light-bg.svg";
import { useAuth } from "../hooks/useAuth";
import TabBar from "./TabBar";

// The shell of the four main pages: header (logo, avatar), content, tabs.
// The avatar opens the profile and remembers the tab to come back to.
function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-base-200 pb-nav text-base-content">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-base-300 bg-base-100 px-4">
        <img src={logo} alt="Fulgora" className="h-8 w-auto" />
        {user !== null && (
          // Read as "LM, mon profil": the visible initials stay part of the name.
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
