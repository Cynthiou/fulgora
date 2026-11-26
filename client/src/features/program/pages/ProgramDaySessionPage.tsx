import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { getWeekdayLabel, type SessionDraft } from "shared";
import ErrorState from "../../../components/ErrorState";
import LoadingState from "../../../components/LoadingState";
import { isAbortError } from "../../../services/api";
import SessionEditorPage from "../../session-template/pages/SessionEditorPage";
import {
  readProgramDaySession,
  writeProgramDaySession,
} from "../services/programService";

// Route /programmes/:programId/seances/:scheduleId: one session of
// the typical week, built with the editor of the free sessions (US-18).
// The date is replaced by the day: it comes from the program (RM-075).
function ProgramDaySessionPage() {
  const params = useParams();
  const navigate = useNavigate();
  const programId = Number(params.programId);
  const scheduleId = Number(params.scheduleId);
  const [draft, setDraft] = useState<SessionDraft | null>(null);
  const [programName, setProgramName] = useState("");
  const [weekday, setWeekday] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is listed on purpose, it re-runs the load
  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    readProgramDaySession(programId, scheduleId, controller.signal)
      .then((answer) => {
        setDraft(answer.session);
        setProgramName(answer.program_name);
        setWeekday(answer.weekday);
      })
      .catch((caught: unknown) => {
        if (!isAbortError(caught)) {
          setError("Impossible de charger cette séance.");
        }
      });
    return () => controller.abort();
  }, [programId, scheduleId, attempt]);

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
        <LoadingState label="Chargement de la séance…" />
      </div>
    );
  }

  return (
    <SessionEditorPage
      edit={{
        path: `/programmes/${programId}/seances/${scheduleId}`,
        subtitle: programName,
        savedDraft: draft,
        dayLabel: getWeekdayLabel(weekday),
        save: async (next) => {
          await writeProgramDaySession(programId, scheduleId, next);
        },
        onSaved: () =>
          navigate(`/programmes/${programId}/informations`, { replace: true }),
      }}
    />
  );
}

export default ProgramDaySessionPage;
