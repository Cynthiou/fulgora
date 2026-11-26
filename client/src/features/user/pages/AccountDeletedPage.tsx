import { useEffect } from "react";
import { Link } from "react-router";
import checkIcon from "../../../assets/icons/ui/app/check.svg";
import Icon from "../../../components/Icon";
import { useAuth } from "../../../hooks/useAuth";

// Screen PRF-08s: the account is gone. The session is closed here, so the
// screen can be shown once the user does not exist any more (US-06).
function AccountDeletedPage() {
  const { logout } = useAuth();

  // biome-ignore lint/correctness/useExhaustiveDependencies: only once, when the screen appears
  useEffect(() => {
    logout();
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-[22px] pb-4">
      <p className="py-3 text-center font-display text-[26px] font-extrabold uppercase italic tracking-[0.1em]">
        Fulgora
      </p>

      <div className="flex flex-1 flex-col justify-center gap-4">
        <span
          aria-hidden="true"
          className="grid size-21 place-items-center rounded-full bg-pick text-pick-content"
        >
          <Icon src={checkIcon} className="size-10" />
        </span>
        <h1 className="font-display text-[48px] font-extrabold uppercase italic leading-none">
          Compte supprimé
        </h1>
        <p className="text-[15px] text-muted">Tes données ont été effacées.</p>
      </div>

      <div className="flex flex-col gap-2.5 pt-3">
        <Link
          to="/inscription"
          replace
          className="flex h-btn items-center justify-center rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action"
        >
          Créer un compte
        </Link>
        <Link
          to="/connexion"
          replace
          className="flex h-[50px] items-center justify-center rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card"
        >
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}

export default AccountDeletedPage;
