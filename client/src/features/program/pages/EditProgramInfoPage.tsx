import { useEffect, useState } from "react";
import { useParams } from "react-router";
import type { ProgramDetailFull } from "shared";
import ErrorState from "../../../components/ErrorState";
import LoadingState from "../../../components/LoadingState";
import { isAbortError } from "../../../services/api";
import { readProgram } from "../services/programService";
import NewProgramPage from "./NewProgramPage";

// Route /programmes/:programId/informations, screen PRO-03b: the first
// step again, on a draft. Unchecking a day says what it would remove
// before anything is saved (US-19).
function EditProgramInfoPage() {
  const params = useParams();
  const id = Number(params.programId);
  const [draft, setDraft] = useState<ProgramDetailFull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is listed on purpose, it re-runs the load
  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    readProgram(id, controller.signal)
      .then(setDraft)
      .catch((caught: unknown) => {
        if (!isAbortError(caught)) {
          setError("Impossible de charger ce programme.");
        }
      });
    return () => controller.abort();
  }, [id, attempt]);

  if (error !== null) {
    return (
      <div className="mx-auto max-w-md p-4">
        <ErrorState
          title={error}
          message="Vérifie ta connexion internet, puis réessaie."
          onRetry={() => setAttempt((count) => count + 1)}
        />
      </div>
    );
  }

  if (draft === null) {
    return (
      <div className="mx-auto max-w-md p-4">
        <LoadingState label="Chargement du programme…" />
      </div>
    );
  }

  return <NewProgramPage draft={draft} />;
}

export default EditProgramInfoPage;
