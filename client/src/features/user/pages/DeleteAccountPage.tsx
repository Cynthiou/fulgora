import { useState } from "react";
import { useNavigate } from "react-router";
import eyeIcon from "../../../assets/icons/ui/app/eye.svg";
import eyeOffIcon from "../../../assets/icons/ui/app/eye-off.svg";
import lockIcon from "../../../assets/icons/ui/app/lock.svg";
import trashIcon from "../../../assets/icons/ui/app/trash.svg";
import xIcon from "../../../assets/icons/ui/app/x.svg";
import Icon from "../../../components/Icon";
import PageHeader from "../../../components/PageHeader";
import TextField from "../../../components/TextField";
import { useAuth } from "../../../hooks/useAuth";
import { ApiError } from "../../../services/apiError";
import { deleteAccount } from "../services/authService";

// What the deletion erases, as the card lists it (PRF-07).
const ERASED = [
  "ton profil et tes préférences",
  "tes séances, programmes et résultats",
  "ton historique, tes records et ta progression",
  "tes exercices personnels",
];

// Screens PRF-07 and PRF-08: the deletion is confirmed twice, the list of
// what disappears then the password (RM-006, D-05).
function DeleteAccountPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<"warning" | "password">("warning");
  const [password, setPassword] = useState("");
  const [isShown, setIsShown] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user === null) {
    return null;
  }

  async function remove() {
    if (isDeleting) {
      return;
    }
    setIsDeleting(true);
    setError(null);
    try {
      await deleteAccount({ password });
      // The session is closed by the next screen, which nothing leads back
      // from (replace).
      navigate("/compte-supprime", { replace: true });
    } catch (caught) {
      setPassword("");
      setIsShown(false);
      if (caught instanceof ApiError && caught.code === "WRONG_PASSWORD") {
        setError("Mot de passe incorrect.");
      } else {
        setError("La suppression n'a pas pu aboutir. Ton compte est intact.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <PageHeader
        onBack={() => navigate("/profil/compte")}
        backLabel="Retour aux paramètres"
        title="Supprimer mon compte"
      />

      {step === "warning" ? (
        <div className="flex flex-1 flex-col gap-3 px-[18px] pt-1 pb-3.5">
          <span
            aria-hidden="true"
            className="grid size-14 place-items-center rounded-card bg-status-missed/10 text-status-missed"
          >
            <Icon src={trashIcon} className="size-7" />
          </span>
          {/* The header already carries the h1 of the screen. */}
          <h2 className="font-display text-[36px] font-extrabold uppercase italic leading-none">
            Supprimer ton compte ?
          </h2>
          <p className="text-sm font-semibold">
            La suppression efface définitivement :
          </p>
          <ul className="flex flex-col gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card">
            {ERASED.map((line) => (
              <li key={line} className="flex items-center gap-2.5 text-sm">
                <Icon
                  src={xIcon}
                  className="size-3.5 shrink-0 text-status-missed"
                />
                {line}
              </li>
            ))}
          </ul>
          <p className="text-sm font-bold text-status-missed-text">
            Cette action ne peut pas être annulée.
          </p>

          <div className="mt-auto grid grid-cols-2 gap-2.5 pt-3">
            <button
              type="button"
              onClick={() => navigate("/profil/compte")}
              className="flex h-btn items-center justify-center rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => setStep("password")}
              className="flex h-btn items-center justify-center rounded-btn border border-status-missed/40 bg-base-100 text-sm font-bold text-status-missed-text shadow-card"
            >
              Continuer
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void remove();
          }}
          className="flex flex-1 flex-col gap-3.5 px-[18px] pt-1 pb-3.5"
        >
          <h2 className="font-display text-[34px] font-extrabold uppercase italic leading-none">
            Confirme la suppression
          </h2>
          <p className="text-sm text-muted">
            {"Saisis ton mot de passe pour supprimer définitivement le compte "}
            <b className="text-base-content">{user.username}</b>.
          </p>

          <TextField
            id="delete-password"
            label="Mot de passe"
            icon={lockIcon}
            type={isShown ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            readOnly={isDeleting}
            error={error ?? undefined}
            trailing={
              <button
                type="button"
                onClick={() => setIsShown((shown) => !shown)}
                aria-label={
                  isShown
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
                className="absolute right-1 grid size-tap place-items-center text-muted"
              >
                <Icon src={isShown ? eyeOffIcon : eyeIcon} className="size-5" />
              </button>
            }
          />

          {isDeleting && (
            <p role="status" className="text-sm font-semibold text-muted">
              Suppression en cours…
            </p>
          )}

          <div className="mt-auto flex flex-col gap-2.5 pt-3">
            <button
              type="submit"
              disabled={password === "" || isDeleting}
              className="flex h-13 items-center justify-center gap-2 rounded-btn bg-status-missed text-sm font-extrabold uppercase tracking-[0.02em] text-white disabled:opacity-60"
            >
              <Icon src={trashIcon} className="size-[18px]" />
              Supprimer définitivement
            </button>
            <button
              type="button"
              onClick={() => navigate("/profil/compte")}
              disabled={isDeleting}
              className="flex h-[50px] items-center justify-center rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card disabled:opacity-60"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default DeleteAccountPage;
