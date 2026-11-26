import { Link, useLocation, useNavigate } from "react-router";
import {
  DISTANCE_UNIT_LABELS,
  getInitials,
  HOME_METRIC_LABELS,
  SEX_LABELS,
  type UserPreferences,
  WEIGHT_UNIT_LABELS,
} from "shared";
import bellIcon from "../../../assets/icons/ui/app/bell.svg";
import gridIcon from "../../../assets/icons/ui/app/grid.svg";
import imageIcon from "../../../assets/icons/ui/app/image.svg";
import lockIcon from "../../../assets/icons/ui/app/lock.svg";
import logoutIcon from "../../../assets/icons/ui/app/logout.svg";
import Icon from "../../../components/Icon";
import PageHeader from "../../../components/PageHeader";
import SheetRow from "../../../components/SheetRow";
import { useAuth } from "../../../hooks/useAuth";
import LogoutConfirmDialog from "../components/LogoutConfirmDialog";
import { useLogout } from "../hooks/useLogout";

// "Sons, vibrations", "Aucune alerte": what the three switches say in one
// line, on the row of the profile (PRF-01).
function describeAlerts(preferences: UserPreferences): string {
  const on: string[] = [];
  if (preferences.sound_enabled) {
    on.push("Sons");
  }
  if (preferences.vibration_enabled) {
    on.push("Vibrations");
  }
  if (preferences.timer_notification_enabled) {
    on.push("Notifications");
  }
  return on.length === 0 ? "Aucune alerte" : on.join(", ");
}

// Screen PRF-01: who is connected, the way to the profile, the
// preferences and the account. The rows that are not built yet say when
// they arrive (US-05, US-06, US-47).
function ProfilePage() {
  const { user } = useAuth();
  const location = useLocation();
  // "Profil enregistré.", handed over by PRF-02 (US-04)
  const flash = (location.state as { flash?: string } | null)?.flash ?? null;
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

        {flash !== null && (
          <p
            role="status"
            className="rounded-card bg-pick px-4 py-3.5 text-center text-sm font-semibold text-pick-content shadow-hero"
          >
            {`✓ ${flash}`}
          </p>
        )}

        <Link
          to="/profil/modifier"
          className="flex h-13 items-center justify-center rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card"
        >
          Modifier le profil
        </Link>

        <section
          aria-labelledby="preferences-title"
          className="flex flex-col gap-2"
        >
          <h2
            id="preferences-title"
            className="font-sans text-overline uppercase not-italic text-muted"
          >
            Préférences
          </h2>
          <div className="overflow-hidden rounded-card border border-base-300 bg-base-100 shadow-card">
            <SheetRow
              isFirst
              icon={gridIcon}
              title="Affichage"
              subtitle={`${WEIGHT_UNIT_LABELS[user.preferences.weight_unit]} · ${
                DISTANCE_UNIT_LABELS[user.preferences.distance_unit]
              } · ${HOME_METRIC_LABELS[user.preferences.home_metric]}`}
              onClick={() => navigate("/profil/affichage")}
            />
            <SheetRow
              icon={bellIcon}
              title="Sons et minuteurs"
              subtitle={describeAlerts(user.preferences)}
              onClick={() => navigate("/profil/sons")}
            />
            <SheetRow
              icon={imageIcon}
              title="Illustrations d'exercice"
              subtitle={user.sex === null ? "Femme" : SEX_LABELS[user.sex]}
              onClick={() => navigate("/profil/illustrations")}
            />
          </div>
        </section>

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
          <div className="overflow-hidden rounded-card border border-base-300 bg-base-100 shadow-card">
            <SheetRow
              isFirst
              icon={lockIcon}
              title="Paramètres du compte"
              subtitle="Mot de passe, suppression"
              onClick={() => navigate("/profil/compte")}
            />
          </div>
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
