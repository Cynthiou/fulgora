import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  type ExerciseListItem,
  getExerciseImage,
  SEX_LABELS,
  SEXES,
  type Sex,
} from "shared";
import imageIcon from "../../../assets/icons/ui/app/image.svg";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
import PageHeader from "../../../components/PageHeader";
import { useAuth } from "../../../hooks/useAuth";
import { isAbortError } from "../../../services/api";
import { readExercises } from "../../exercise/services/exerciseService";
import { updateProfile } from "../services/authService";

// Screens PRF-05 and PRF-05b: the drawings of the exercises, Femme or
// Homme, with an example. Nothing else changes (RM-004, RM-014).
function IllustrationSettingsPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [example, setExample] = useState<ExerciseListItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    readExercises({ search: "Squat", offset: 0 }, controller.signal)
      .then((page) => setExample(page.items[0] ?? null))
      .catch((caught: unknown) => {
        if (!isAbortError(caught)) {
          setExample(null);
        }
      });
    return () => controller.abort();
  }, []);

  if (user === null) {
    return null;
  }

  async function choose(sex: Sex) {
    if (user === null || isSaving || user.sex === sex) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      refresh(await updateProfile({ username: user.username, sex }));
    } catch {
      setError("Impossible d'enregistrer ce choix.");
    } finally {
      setIsSaving(false);
    }
  }

  const image = example === null ? null : getExerciseImage(example, user.sex);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <PageHeader
        onBack={() => navigate("/profil")}
        backLabel="Retour au profil"
        title="Illustrations"
      />

      <div className="flex flex-1 flex-col gap-3 px-[18px] pt-1 pb-6">
        <span className="font-sans text-overline uppercase not-italic text-accent">
          Afficher les illustrations
        </span>
        <fieldset disabled={isSaving} className="grid grid-cols-2 gap-2.5">
          <legend className="sr-only">Illustrations des exercices</legend>
          {SEXES.map((one) => (
            <label
              key={one}
              className={`relative flex h-13 cursor-pointer items-center justify-center rounded-btn border text-sm font-bold focus-within:ring-2 focus-within:ring-secondary ${
                user.sex === one
                  ? "border-pick bg-pick text-pick-content"
                  : "border-base-300 bg-base-100 shadow-card"
              }`}
            >
              <input
                type="radio"
                name="illustrations"
                value={one}
                checked={user.sex === one}
                onChange={() => choose(one)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              {SEX_LABELS[one]}
            </label>
          ))}
        </fieldset>

        {error !== null && <ErrorState title={error} />}

        {example !== null && (
          <figure className="flex flex-col gap-2 rounded-card border border-base-300 bg-base-100 p-4 shadow-card">
            <figcaption className="font-sans text-overline uppercase not-italic text-muted">
              {`Exemple · ${example.name}`}
            </figcaption>
            {image === null ? (
              <p className="flex h-40 flex-col items-center justify-center gap-2 rounded-card bg-soft text-sm text-muted">
                <Icon src={imageIcon} className="size-6" />
                Pas d'illustration pour cet exercice
              </p>
            ) : (
              <img
                src={image}
                alt={example.name}
                className="aspect-[3/2] w-full rounded-card bg-white object-contain"
              />
            )}
          </figure>
        )}

        <p className="text-xs leading-[1.45] text-muted">
          Les exercices, objectifs et mesures restent les mêmes. Seuls les
          dessins et la carte musculaire changent. Si la version choisie manque,
          on affiche l'autre.
        </p>
      </div>
    </div>
  );
}

export default IllustrationSettingsPage;
