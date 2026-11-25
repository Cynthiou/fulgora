import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  canActivateProgram,
  formatPeriod,
  formatReadySessions,
  formatWeekdays,
  getWeekdayLabel,
  type ProgramCreated,
  type ProgramDetail,
} from "shared";
import chevronLeftIcon from "../../../assets/icons/ui/chevrons/chevron-left.svg";
import chevronRightIcon from "../../../assets/icons/ui/chevrons/chevron-right.svg";
import ConfirmDialog from "../../../components/ConfirmDialog";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
import LoadingState from "../../../components/LoadingState";
import { isAbortError } from "../../../services/api";
import { ApiError } from "../../../services/apiError";
import {
  activateProgram,
  deleteProgramDraft,
  readProgram,
} from "../services/programService";

const PRIMARY_BUTTON =
  "flex h-btn w-full items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action disabled:opacity-60";
const SECONDARY_BUTTON =
  "flex h-btn w-full items-center justify-center rounded-btn border border-base-300 bg-base-100 font-semibold disabled:opacity-60";

// Screens PRO-03, PRO-03v and PRO-03f, step 2 of 3: one session per chosen
// day. "Créer le programme" waits for every session to hold an exercise
// (RM-072); the draft can be left as it is at any time (RM-071).
function ProgramSessionsPage() {
  const params = useParams();
  const navigate = useNavigate();
  const id = Number(params.programId);
  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [created, setCreated] = useState<ProgramCreated | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is listed on purpose, it re-runs the load
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    readProgram(id, controller.signal)
      .then((data) => {
        setProgram(data);
        setIsLoading(false);
      })
      .catch((caught: unknown) => {
        if (isAbortError(caught)) {
          return;
        }
        setError(
          caught instanceof ApiError && caught.status === 404
            ? "Programme introuvable"
            : "Impossible de charger le programme.",
        );
        setIsLoading(false);
      });
    return () => controller.abort();
  }, [id, attempt]);

  async function create() {
    setIsSending(true);
    setError(null);
    try {
      setCreated(await activateProgram(id));
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Impossible de créer le programme. Réessaie.",
      );
    } finally {
      setIsSending(false);
    }
  }

  async function removeDraft() {
    setIsSending(true);
    try {
      await deleteProgramDraft(id);
      navigate("/planning", { replace: true });
    } catch {
      setError("Impossible de supprimer le brouillon.");
      setIsSending(false);
    }
  }

  // Screen PRO-06: the program is created and the Planning is full.
  if (created !== null && program !== null) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-4">
        <h1 className="text-display-md">Programme créé</h1>
        <p className="rounded-card border border-base-300 bg-base-100 p-4 shadow-card">
          <span className="font-semibold">
            {created.appointment_count} séances ajoutées au Planning
          </span>
          {created.first_date !== null && created.last_date !== null && (
            <>, {formatPeriod(created.first_date, created.last_date)}.</>
          )}
        </p>
        <p className="text-muted">
          {created.status === "programmed"
            ? `Statut « À venir » jusqu'au ${program.start_date}.`
            : "Statut « En cours » : la première séance t'attend."}
        </p>
        <div className="mt-auto flex flex-col gap-3">
          <Link to="/planning" className={PRIMARY_BUTTON}>
            Voir le planning
          </Link>
          <Link to="/programmes" className={SECONDARY_BUTTON}>
            Voir mes programmes
          </Link>
        </div>
      </div>
    );
  }

  const sessions = program?.sessions ?? [];
  const canCreate = canActivateProgram(sessions);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-base-300 bg-base-100 px-2">
        <button
          type="button"
          onClick={() => setIsLeaving(true)}
          aria-label="Retour"
          className="flex size-tap items-center justify-center rounded-btn text-secondary"
        >
          <Icon src={chevronLeftIcon} className="size-7" />
        </button>
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-display-sm">
            {program?.name ?? "Programme"}
          </h1>
          <p className="text-sm text-muted">Étape 2 / 3 · Séances</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pb-32">
        {isLoading && <LoadingState label="Chargement du programme…" />}

        {!isLoading && error !== null && program === null && (
          <ErrorState
            title={error}
            message="Vérifie ta connexion internet, puis réessaie."
            onRetry={() => setAttempt((count) => count + 1)}
          />
        )}

        {!isLoading && program !== null && (
          <>
            <p className="rounded-card border border-base-300 bg-base-100 p-3 text-sm text-muted shadow-card">
              {formatPeriod(program.start_date, program.end_date)} ·{" "}
              {formatWeekdays(sessions.map((session) => session.weekday))}
            </p>

            <p className="text-muted">
              Une séance a été créée pour chaque jour choisi. Donne-lui un nom
              et ajoute ses exercices.
            </p>

            <p aria-live="polite" className="font-semibold">
              {formatReadySessions(sessions)}
            </p>

            <ul className="flex flex-col gap-2">
              {sessions.map((session) => (
                <li key={session.weekday}>
                  <Link
                    to={`/programmes/${id}/seances/${session.weekday}`}
                    className="flex items-center gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-overline uppercase text-accent">
                        {getWeekdayLabel(session.weekday)}
                      </span>
                      <span className="truncate font-display text-display-sm">
                        {session.name}
                      </span>
                      <span className="truncate text-sm text-muted">
                        {session.exercise_count === 0
                          ? "À configurer · aucun exercice"
                          : session.exercise_names}
                      </span>
                    </span>
                    <Icon
                      src={chevronRightIcon}
                      className="size-5 shrink-0 text-muted"
                    />
                  </Link>
                </li>
              ))}
            </ul>

            {error !== null && (
              <p role="alert" className="font-semibold">
                {error}
              </p>
            )}
          </>
        )}
      </div>

      {!isLoading && program !== null && (
        <div className="fixed inset-x-0 bottom-0 border-t border-base-300 bg-base-100 p-4">
          <div className="mx-auto flex max-w-md flex-col gap-2">
            <button
              type="button"
              onClick={create}
              disabled={isSending || !canCreate}
              aria-describedby={canCreate ? undefined : "not-ready"}
              className={PRIMARY_BUTTON}
            >
              {isSending ? "Création…" : "Créer le programme"}
            </button>
            {!canCreate && (
              <p id="not-ready" className="text-center text-sm text-muted">
                Chaque séance doit contenir au moins un exercice.
              </p>
            )}
            <Link to="/programmes" className={SECONDARY_BUTTON}>
              Enregistrer le brouillon
            </Link>
          </div>
        </div>
      )}

      {isLeaving && (
        // Screen PRO-03e: what happens to the program being built
        <ConfirmDialog
          title={`« ${program?.name ?? "Ce programme"} » n'est pas encore créé`}
          message="Enregistre-le en brouillon pour le reprendre plus tard : il n'apparaîtra pas dans le Planning."
          confirmLabel="Supprimer et quitter"
          cancelLabel="Continuer"
          onConfirm={removeDraft}
          onCancel={() => setIsLeaving(false)}
        />
      )}
    </div>
  );
}

export default ProgramSessionsPage;
