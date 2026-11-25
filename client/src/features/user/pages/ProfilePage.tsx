import { Link, useLocation, useNavigate } from "react-router";
import { getInitials } from "shared";
import lockIcon from "../../../assets/icons/ui/app/lock.svg";
import logoutIcon from "../../../assets/icons/ui/app/logout.svg";
import Icon from "../../../components/Icon";
import PageHeader from "../../../components/PageHeader";
import { useAuth } from "../../../hooks/useAuth";
import LogoutConfirmDialog from "../components/LogoutConfirmDialog";
import { useLogout } from "../hooks/useLogout";

// PRF-01, minimal for the MVP: who is connected and the way out.
// Preferences and account settings arrive with US-04 to US-06, so the rows
// of the mockup are not drawn yet.
function ProfilePage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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
    <section className="mx-auto flex min-h-screen max-w-md flex-col">
      <PageHeader onBack={() => navigate(backTo)} title="Mon profil" />

      <div className="flex flex-1 flex-col gap-2.5 px-[18px] pb-3.5">
        {/* The avatar, the name and the address, centred (PRF-01). */}
        <div className="flex flex-col items-center gap-2 py-1.5">
          <span
            aria-hidden="true"
            className="grid size-22 place-items-center rounded-full bg-pick text-[28px] font-extrabold text-pick-content ring-2 ring-secondary ring-offset-4 ring-offset-base-200"
          >
            {getInitials(user.username)}
          </span>
          <p className="font-display text-[30px] font-extrabold uppercase italic leading-none">
            {user.username}
          </p>
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-muted">
            <Icon src={lockIcon} className="size-[13px] text-faint" />
            {user.email}
          </p>
        </div>

        <section
          aria-labelledby="account-title"
          className="flex flex-col gap-2"
        >
          <h2
            id="account-title"
            className="font-sans text-overline uppercase not-italic text-muted"
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
                className="h-12 rounded-btn border border-base-300 bg-base-100 px-5 text-sm font-bold"
              >
                Réessayer
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={requestLogout}
            disabled={isLoggingOut}
            className="flex h-[50px] items-center justify-center gap-2 rounded-btn border border-status-missed/35 text-sm font-bold text-status-missed-text disabled:opacity-60"
          >
            <Icon src={logoutIcon} className="size-[18px]" />
            {isLoggingOut ? "Déconnexion…" : "Se déconnecter"}
          </button>
          {/* The preferences and the account settings arrive with US-04
              to US-06; the mockup already draws their rows. */}
          <p className="text-center text-xs text-muted">
            Préférences et paramètres du compte : bientôt.
          </p>
        </section>

        <p className="mt-auto text-center text-xs text-muted">
          <Link to={backTo} className="font-semibold text-secondary">
            Retour
          </Link>
        </p>
      </div>

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
