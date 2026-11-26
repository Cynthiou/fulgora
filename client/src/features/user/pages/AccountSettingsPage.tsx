import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { formatFullDate } from "shared";
import eyeIcon from "../../../assets/icons/ui/app/eye.svg";
import eyeOffIcon from "../../../assets/icons/ui/app/eye-off.svg";
import lockIcon from "../../../assets/icons/ui/app/lock.svg";
import Icon from "../../../components/Icon";
import PageHeader from "../../../components/PageHeader";
import TextField from "../../../components/TextField";
import { useAuth } from "../../../hooks/useAuth";
import {
  type PasswordField,
  useChangePassword,
} from "../hooks/useChangePassword";

const EMPTY = { current_password: "", new_password: "", confirm_password: "" };

// Screen PRF-06: what the account is, and the way to change its password
// (US-47). The deletion arrives with US-06.
function AccountSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSubmitting, fieldErrors, formError, submit } = useChangePassword();
  const [values, setValues] = useState(EMPTY);
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [isDone, setIsDone] = useState(false);
  const fields = useRef<Partial<Record<PasswordField, HTMLInputElement>>>({});

  if (user === null) {
    return null;
  }

  const isComplete =
    values.current_password !== "" &&
    values.new_password !== "" &&
    values.confirm_password !== "";

  async function change() {
    setIsDone(false);
    const ok = await submit(values);
    // After an error as after a success, the three fields are emptied.
    setValues(EMPTY);
    setShown({});
    setIsDone(ok);
    if (!ok) {
      // The focus goes to the first field in error (PRF-06e).
      window.setTimeout(() => {
        const first = (
          ["current_password", "new_password", "confirm_password"] as const
        ).find((field) => fieldErrors[field] !== undefined);
        fields.current[first ?? "current_password"]?.focus();
      }, 0);
    }
  }

  function passwordField(
    field: PasswordField,
    label: string,
    autoComplete: string,
    help?: string,
  ) {
    return (
      <TextField
        id={field}
        label={label}
        icon={lockIcon}
        ref={(input) => {
          if (input !== null) {
            fields.current[field] = input;
          }
        }}
        type={shown[field] === true ? "text" : "password"}
        value={values[field]}
        onChange={(event) =>
          setValues((current) => ({ ...current, [field]: event.target.value }))
        }
        autoComplete={autoComplete}
        readOnly={isSubmitting}
        help={help}
        error={fieldErrors[field]}
        trailing={
          <button
            type="button"
            onClick={() =>
              setShown((current) => ({
                ...current,
                [field]: current[field] !== true,
              }))
            }
            aria-label={
              shown[field] === true
                ? `Masquer ${label.toLocaleLowerCase("fr-FR")}`
                : `Afficher ${label.toLocaleLowerCase("fr-FR")}`
            }
            className="absolute right-1 grid size-tap place-items-center text-muted"
          >
            <Icon
              src={shown[field] === true ? eyeOffIcon : eyeIcon}
              className="size-5"
            />
          </button>
        }
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <PageHeader
        onBack={() => navigate("/profil")}
        backLabel="Retour au profil"
        title="Paramètres du compte"
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void change();
        }}
        className="flex flex-1 flex-col gap-2.5 px-[18px] pt-1 pb-3.5"
      >
        {/* The account itself, in a card of three lines (D-05). */}
        <dl className="overflow-hidden rounded-card border border-base-300 bg-base-100 shadow-card">
          {[
            { label: "Pseudo", value: user.username },
            { label: "E-mail", value: user.email },
            { label: "Créé le", value: formatFullDate(user.created_at) },
          ].map((line, index) => (
            <div
              key={line.label}
              className={`flex min-h-14 flex-col justify-center gap-0.5 px-[14px] ${
                index === 0 ? "" : "border-t border-base-300"
              }`}
            >
              <dt className="text-[15px] font-semibold">{line.label}</dt>
              <dd className="text-xs text-muted">{line.value}</dd>
            </div>
          ))}
        </dl>

        <h2 className="font-display text-[22px] font-extrabold uppercase italic leading-none">
          Changer le mot de passe
        </h2>

        {passwordField(
          "current_password",
          "Mot de passe actuel",
          "current-password",
        )}
        {passwordField(
          "new_password",
          "Nouveau mot de passe",
          "new-password",
          "Mêmes règles qu'à l'inscription.",
        )}
        {passwordField(
          "confirm_password",
          "Confirmer le mot de passe",
          "new-password",
        )}

        {formError !== null && (
          <p
            role="alert"
            className="flex items-start gap-1 text-sm font-semibold"
          >
            <span aria-hidden="true" className="text-status-missed">
              ⚠
            </span>
            <span>{formError}</span>
          </p>
        )}

        {/* The deletion of the account arrives with US-06. */}
        <p className="py-1.5 text-center text-sm font-semibold text-muted">
          Supprimer mon compte : bientôt.
        </p>

        <button
          type="submit"
          disabled={!isComplete || isSubmitting}
          className="mt-auto flex h-btn items-center justify-center rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60"
        >
          {isSubmitting ? "Changement…" : "Changer le mot de passe"}
        </button>
      </form>

      {/* PRF-06s: the dark toast at the bottom of the screen. */}
      {isDone && (
        <p
          role="status"
          className="fixed inset-x-[18px] bottom-10 z-10 mx-auto flex max-w-md items-center gap-2.5 rounded-card bg-pick px-4 py-3.5 text-sm font-semibold text-pick-content shadow-hero"
        >
          <span aria-hidden="true" className="text-status-done-text">
            ✓
          </span>
          <span>Mot de passe changé. La session en cours reste ouverte.</span>
        </p>
      )}
    </div>
  );
}

export default AccountSettingsPage;
