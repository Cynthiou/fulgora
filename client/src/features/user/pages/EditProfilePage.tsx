import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { SEX_LABELS, SEXES, type Sex, usernameSchema } from "shared";
import lockIcon from "../../../assets/icons/ui/app/lock.svg";
import ConfirmDialog from "../../../components/ConfirmDialog";
import Icon from "../../../components/Icon";
import PageHeader from "../../../components/PageHeader";
import TextField from "../../../components/TextField";
import { useAuth } from "../../../hooks/useAuth";
import { ApiError } from "../../../services/apiError";
import { updateProfile } from "../services/authService";

// Screen PRF-02: the pseudo and the illustrations. The e-mail never
// changes (RM-003) and the choice only drives the drawings (RM-004).
function EditProfilePage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(user?.username ?? "");
  const [sex, setSex] = useState<Sex | null>(user?.sex ?? null);
  const [error, setError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  if (user === null) {
    return null;
  }

  const hasChanged = username !== user.username || sex !== user.sex;

  async function save(event?: FormEvent) {
    event?.preventDefault();
    if (user === null || isSaving || !hasChanged) {
      return;
    }
    const checked = usernameSchema.safeParse(username);
    if (!checked.success) {
      setError(checked.error.issues[0]?.message ?? "Pseudo invalide.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setNetworkError(null);
    try {
      refresh(await updateProfile({ username: checked.data, sex }));
      navigate("/profil", {
        replace: true,
        state: { flash: "Profil enregistré." },
      });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setError(caught.message);
      } else {
        setNetworkError("Enregistrement impossible.");
      }
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <PageHeader
        onBack={() => (hasChanged ? setIsLeaving(true) : navigate("/profil"))}
        backLabel="Retour au profil"
        title="Modifier le profil"
      />

      <form
        onSubmit={save}
        className="flex flex-1 flex-col gap-3 px-[18px] pt-1 pb-28"
      >
        <fieldset disabled={isSaving} className="flex flex-col gap-3">
          <TextField
            id="profile-username"
            label="Pseudo"
            required
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setError(null);
            }}
            autoComplete="username"
            maxLength={30}
            help="Visible par toi seul pour l'instant. Doit être unique."
            error={error ?? undefined}
          />

          <div className="flex flex-col gap-1.5">
            <span className="font-sans text-overline uppercase not-italic text-muted">
              E-mail · non modifiable
            </span>
            <p className="flex h-field items-center gap-2 rounded-btn border border-base-300 bg-soft px-4 text-[15px] text-muted">
              <Icon src={lockIcon} className="size-4 shrink-0" />
              {user.email}
            </p>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="font-sans text-overline uppercase not-italic text-accent">
              Illustrations des exercices
            </legend>
            <div
              role="radiogroup"
              aria-label="Illustrations des exercices"
              className="grid grid-cols-2 gap-2.5"
            >
              {SEXES.map((one) => (
                <button
                  key={one}
                  type="button"
                  role="radio"
                  aria-checked={sex === one}
                  onClick={() => setSex(one)}
                  className={`h-13 rounded-btn border text-sm font-bold ${
                    sex === one
                      ? "border-pick bg-pick text-pick-content"
                      : "border-base-300 bg-base-100 shadow-card"
                  }`}
                >
                  {SEX_LABELS[one]}
                </button>
              ))}
            </div>
            <p className="text-xs leading-[1.45] text-muted">
              Sert uniquement à choisir les dessins des exercices. Ne change ni
              les exercices, ni les objectifs, ni les mesures.
            </p>
          </fieldset>

          {networkError !== null && (
            <div
              role="alert"
              className="flex flex-col gap-2 rounded-card border border-status-missed bg-base-100 p-3"
            >
              <p className="font-semibold">{networkError}</p>
              <p className="text-sm text-muted">
                Vérifie ta connexion puis réessaie. Tes saisies sont conservées.
              </p>
              <button
                type="button"
                onClick={() => save()}
                className="h-12 rounded-btn border border-base-300 bg-base-100 text-sm font-bold"
              >
                Réessayer
              </button>
            </div>
          )}
        </fieldset>
      </form>

      <div className="fixed inset-x-0 bottom-0 px-[18px] pt-3 pb-1">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={() => save()}
            disabled={!hasChanged || isSaving}
            className="flex h-btn w-full items-center justify-center rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60"
          >
            {isSaving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      {isLeaving && (
        <ConfirmDialog
          title="Quitter sans enregistrer ?"
          message="Tes changements seront perdus."
          confirmLabel="Quitter"
          cancelLabel="Continuer à modifier"
          tone="danger"
          onConfirm={() => navigate("/profil")}
          onCancel={() => setIsLeaving(false)}
        />
      )}
    </div>
  );
}

export default EditProfilePage;
