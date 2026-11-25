import { Link, useLocation } from "react-router";
import { getInitials } from "shared";
import chevronLeftIcon from "../../../assets/icons/ui/chevrons/chevron-left.svg";
import Icon from "../../../components/Icon";
import { useAuth } from "../../../hooks/useAuth";
import LogoutConfirmDialog from "../components/LogoutConfirmDialog";
import { useLogout } from "../hooks/useLogout";

// PRF-01, minimal for the MVP: who is connected and the way out.
// Preferences and account settings arrive with US-04 to US-06.
function ProfilePage() {
  const { user } = useAuth();
  const location = useLocation();
  // The tab the avatar was clicked from (US-44); the home page otherwise.
  const state = location.state as { from?: string } | null;
  const backTo = state?.from ?? "/";
  const {
    isLoggingOut,
    error,
    sessionToConfirm,
    requestLogout,
    confirmLogout,
    stayConnected,
    retry,
  } = useLogout();

  // Always under ProtectedRoute, so the user is known; this keeps TypeScript happy.
  if (user === null) {
    return null;
  }

  return (
    <section className="mx-auto flex max-w-md flex-col gap-6 p-4">
      <div className="flex items-center gap-2">
        <Link
          to={backTo}
          aria-label="Retour"
          className="-ml-3 flex size-tap items-center justify-center rounded-btn text-secondary"
        >
          <Icon src={chevronLeftIcon} className="size-7" />
        </Link>
        <h1 className="text-display-md">Mon profil</h1>
      </div>

      <div className="flex items-center gap-4 rounded-card border border-base-300 bg-base-100 p-4 shadow-card">
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-xl font-extrabold text-secondary-content"
        >
          {getInitials(user.username)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.username}</p>
          <p className="truncate text-muted">{user.email}</p>
        </div>
      </div>

      <section aria-labelledby="account-title" className="flex flex-col gap-3">
        <h2
          id="account-title"
          className="font-sans text-overline not-italic uppercase text-accent"
        >
          Compte
        </h2>
        {error !== null && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-card border border-status-missed bg-base-100 p-3"
          >
            <p className="font-semibold">{error}</p>
            <button
              type="button"
              onClick={retry}
              disabled={isLoggingOut}
              className="h-12 rounded-btn border border-base-300 bg-base-100 px-5 font-semibold"
            >
              Réessayer
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={requestLogout}
          disabled={isLoggingOut}
          className="h-12 rounded-btn border border-base-300 bg-base-100 font-semibold disabled:opacity-60"
        >
          {isLoggingOut ? "Déconnexion…" : "Se déconnecter"}
        </button>
      </section>

      {sessionToConfirm !== null && (
        <LogoutConfirmDialog
          session={sessionToConfirm}
          isLoggingOut={isLoggingOut}
          onConfirm={confirmLogout}
          onStay={stayConnected}
        />
      )}
    </section>
  );
}

export default ProfilePage;
