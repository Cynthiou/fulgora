import { Link, useNavigate, useParams } from "react-router";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import LoadingState from "../../../components/LoadingState";
import { updateSession } from "../../appointment/services/appointmentService";
import { useEditableSession } from "../hooks/useEditableSession";
import SessionEditorPage from "./SessionEditorPage";

const SECONDARY_LINK =
  "flex h-12 items-center justify-center rounded-btn border border-base-300 bg-base-100 font-semibold";

// Route /seances/:appointmentId/modifier (CAL-06 for a free session): the
// planned session is read, then the editor opens on it (US-17). A session
// already started, done or cancelled never comes this far.
function EditSessionPage() {
  const params = useParams();
  const navigate = useNavigate();
  const id = Number(params.appointmentId);
  const { session, isLoading, notFound, notEditable, error, reload } =
    useEditableSession(id);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md p-4">
        <LoadingState label="Chargement de la séance…" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-md p-4">
        <EmptyState
          title="Séance introuvable"
          message="Elle n'existe pas, ou elle ne t'appartient pas."
        >
          <Link to="/planning" className={SECONDARY_LINK}>
            Voir le planning
          </Link>
        </EmptyState>
      </div>
    );
  }

  if (notEditable) {
    return (
      <div className="mx-auto max-w-md p-4">
        <EmptyState
          title="Cette séance ne se modifie plus"
          message="Elle a déjà été commencée ou annulée. Sa préparation et ses résultats restent tels quels."
        >
          <Link to={`/seances/${id}`} className={SECONDARY_LINK}>
            Revenir à la séance
          </Link>
        </EmptyState>
      </div>
    );
  }

  if (error !== null || session === null) {
    return (
      <div className="mx-auto max-w-md p-4">
        <ErrorState
          title="Impossible de charger la séance"
          message="Vérifie ta connexion internet, puis réessaie."
          onRetry={reload}
        />
      </div>
    );
  }

  return (
    <SessionEditorPage
      edit={{
        path: `/seances/${id}/modifier`,
        subtitle: session.program_name,
        savedDraft: session.session,
        save: async (draft) => {
          await updateSession(session.appointment_id, "this", draft);
        },
        onSaved: () =>
          navigate(`/seances/${session.appointment_id}`, {
            replace: true,
            state: { flash: "Séance modifiée." },
          }),
      }}
    />
  );
}

export default EditSessionPage;
