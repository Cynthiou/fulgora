import { Link, useLocation, useNavigate, useParams } from "react-router";
import { formatLongDate, formatTimeOfDay, getHistoryStatus } from "shared";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import LoadingState from "../../../components/LoadingState";
import PageHeader from "../../../components/PageHeader";
import StatusChip from "../../../components/StatusChip";
import PlannedOnlyView from "../components/PlannedOnlyView";
import SessionStats from "../components/SessionStats";
import SetComparisonTable from "../components/SetComparisonTable";
import { useHistoryDetail } from "../hooks/useHistoryDetail";

const PRIMARY_LINK =
  "flex h-btn w-full items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action";

// "jeudi 19 novembre"
function lower(date: string): string {
  const text = formatLongDate(date);
  return text.charAt(0).toLowerCase() + text.slice(1);
}

// Screens SUI-06 and SUI-06b: a past session, planned against done.
function HistoryDetailPage() {
  const params = useParams();
  const id = Number(params.appointmentId);
  const navigate = useNavigate();
  const location = useLocation();
  const { detail, isLoading, notFound, error, reload } = useHistoryDetail(id);

  function goBack() {
    if (location.key === "default") {
      navigate("/suivi");
    } else {
      navigate(-1);
    }
  }

  const status =
    detail === null
      ? null
      : getHistoryStatus({
          appointment_id: detail.appointment.id,
          history_date: detail.appointment.planned_date,
          planned_date: detail.appointment.planned_date,
          planned_time: detail.appointment.planned_time,
          initial_date: null,
          moved_manually: false,
          appointment_status: detail.appointment.status,
          session_name: detail.appointment.session_name,
          program_name: detail.appointment.program_name,
          workout:
            detail.kind === "done"
              ? {
                  id: detail.workout.id,
                  status: detail.workout.status,
                  started_at: detail.workout.started_at,
                }
              : null,
        });

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <PageHeader
        onBack={goBack}
        backLabel="Retour à l'historique"
        title={detail?.appointment.session_name ?? "Séance"}
        subtitle={detail?.appointment.program_name ?? "Séance libre"}
      />

      <div className="flex flex-1 flex-col gap-2.5 px-[18px] pt-1 pb-8">
        {isLoading && <LoadingState label="Chargement de la séance…" />}

        {!isLoading && notFound && (
          <EmptyState
            title="Séance introuvable"
            message="Elle n'existe pas, ou elle ne t'appartient pas."
          >
            <Link to="/suivi" className={PRIMARY_LINK}>
              Retour à l'historique
            </Link>
          </EmptyState>
        )}

        {!isLoading && !notFound && error !== null && (
          <ErrorState
            title="Impossible de charger la séance."
            message="Vérifie ta connexion internet, puis réessaie."
            onRetry={reload}
          />
        )}

        {!isLoading &&
          detail !== null &&
          status !== null &&
          error === null &&
          !notFound && (
            <>
              <div className="flex flex-col items-start gap-1.5">
                <StatusChip status={status} />
                {detail.kind === "done" ? (
                  <p className="text-[13px] font-semibold leading-[1.45] text-muted">
                    {detail.workout.status === "completed"
                      ? "Effectuée"
                      : "Commencée"}{" "}
                    {lower(detail.workout.started_at.slice(0, 10))} ·{" "}
                    {formatTimeOfDay(detail.workout.started_at)}
                  </p>
                ) : (
                  <p className="text-[13px] font-semibold leading-[1.45] text-muted">
                    Prévue {lower(detail.appointment.planned_date)} ·{" "}
                    {detail.appointment.planned_time ?? "sans heure"}
                  </p>
                )}
              </div>

              {detail.kind === "done" ? (
                <>
                  <SessionStats workout={detail.workout} />
                  {detail.workout.blocks.flatMap((block) =>
                    block.exercises.map((exercise) => (
                      <SetComparisonTable
                        key={exercise.id}
                        exercise={exercise}
                      />
                    )),
                  )}
                  {/* "Corriger les résultats" arrives with US-37. */}
                </>
              ) : (
                <PlannedOnlyView blocks={detail.blocks} />
              )}
            </>
          )}
      </div>
    </div>
  );
}

export default HistoryDetailPage;
