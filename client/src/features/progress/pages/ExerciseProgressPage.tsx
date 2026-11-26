import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import {
  buildProgressSeries,
  computeExerciseRecords,
  type ExerciseProgress,
  formatDayMonth,
  formatDistance,
  formatDuration,
  formatMetricValue,
  formatProgressTrend,
  formatWeight,
  getAvailableMetrics,
  getMeasureProfile,
  PROGRESS_METRIC_LABELS,
  type ProgressMetric,
} from "shared";
import ErrorState from "../../../components/ErrorState";
import LoadingState from "../../../components/LoadingState";
import PageHeader from "../../../components/PageHeader";
import { isAbortError } from "../../../services/api";
import { ApiError } from "../../../services/apiError";
import ProgressChart from "../components/ProgressChart";
import RecordGrid from "../components/RecordGrid";
import { readExerciseProgress } from "../services/progressService";

// Screens SUI-09, SUI-10, SUI-10b and SUI-11: how one exercise has gone.
// Everything is computed from the sets really done (RM-051).
function ExerciseProgressPage() {
  const params = useParams();
  const id = Number(params.exerciseId);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Arriving from the notification of a record (NOT-06)
  const fromRecord = searchParams.get("record") === "1";
  const [progress, setProgress] = useState<ExerciseProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [metric, setMetric] = useState<ProgressMetric | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is listed on purpose, it re-runs the load
  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    readExerciseProgress(id, controller.signal)
      .then((data) => {
        setProgress(data);
        setMetric(null);
      })
      .catch((caught: unknown) => {
        if (isAbortError(caught)) {
          return;
        }
        setError(
          caught instanceof ApiError && caught.status === 404
            ? "Cet exercice n'existe pas."
            : "Impossible de charger la progression.",
        );
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

  if (progress === null) {
    return (
      <div className="mx-auto max-w-md p-4">
        <LoadingState label="Chargement de la progression…" />
      </div>
    );
  }

  const profile = getMeasureProfile(
    progress.measure_codes,
    progress.is_bodyweight,
  );
  const metrics = getAvailableMetrics(progress.sets, profile);
  const chosen = metric ?? metrics[0] ?? null;
  const points =
    chosen === null ? [] : buildProgressSeries(progress.sets, chosen);
  const records = computeExerciseRecords(progress.sets);
  const last = points[points.length - 1];

  const blocks: { label: string; value: string; detail?: string | null }[] = [];
  if (records.weight_max !== null) {
    blocks.push({
      label: "Charge max",
      value: formatWeight(records.weight_max.weight_kg),
      detail:
        records.weight_max.reps === null
          ? null
          : `× ${records.weight_max.reps}`,
    });
  }
  if (records.one_rep_max !== null) {
    blocks.push({
      label: "1RM estimée",
      value: formatWeight(records.one_rep_max),
      detail: "estimation · Epley",
    });
  }
  if (records.best_set_volume !== null) {
    blocks.push({
      label: "Volume · série",
      value: formatWeight(records.best_set_volume.volume),
      detail: `${records.best_set_volume.reps} × ${formatWeight(
        records.best_set_volume.weight_kg,
      )}`,
    });
  }
  if (records.best_session_volume !== null) {
    blocks.push({
      label: "Volume · séance",
      value: formatWeight(records.best_session_volume),
    });
  }
  if (records.max_reps !== null && records.weight_max === null) {
    blocks.push({
      label: "Répétitions max",
      value: `${records.max_reps} rép.`,
    });
  }
  if (records.max_duration_seconds !== null) {
    blocks.push({
      label: "Durée max",
      value: formatDuration(records.max_duration_seconds),
    });
  }
  if (records.max_distance_meters !== null) {
    blocks.push({
      label: "Distance",
      value: formatDistance(records.max_distance_meters),
    });
  }
  blocks.push({
    label: "Séances",
    value: String(records.session_count),
    detail:
      points.length === 0
        ? null
        : `depuis le ${formatDayMonth(points[0]?.date ?? "")}`,
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <PageHeader
        onBack={() => navigate("/suivi/exercices")}
        backLabel="Retour aux exercices"
        title={progress.name}
        subtitle={progress.meta ?? undefined}
      />

      <div className="flex flex-1 flex-col gap-3 px-[18px] pt-1 pb-6">
        {fromRecord && points.length > 0 && (
          <p
            role="status"
            className="flex items-center gap-2.5 rounded-card bg-pick px-4 py-3.5 text-sm font-semibold text-pick-content shadow-hero"
          >
            {`Nouveau record · ${formatDayMonth(
              points[points.length - 1]?.date ?? "",
            )}`}
          </p>
        )}

        {progress.sets.length === 0 ? (
          <p className="rounded-card border border-base-300 bg-base-100 p-4 text-sm text-muted shadow-card">
            Cet exercice n'a pas encore été fait. Sa progression apparaîtra
            après ta première séance.
          </p>
        ) : (
          <>
            {metrics.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {metrics.map((one) => (
                  <button
                    key={one}
                    type="button"
                    aria-pressed={one === chosen}
                    onClick={() => setMetric(one)}
                    className={`h-9 rounded-chip px-3.5 text-[13px] font-bold ${
                      one === chosen
                        ? "bg-pick text-pick-content"
                        : "border border-base-300 bg-base-100 shadow-card"
                    }`}
                  >
                    {PROGRESS_METRIC_LABELS[one]}
                  </button>
                ))}
              </div>
            )}

            {chosen !== null && last !== undefined && (
              <div className="flex flex-col gap-1">
                <span className="font-sans text-overline uppercase not-italic text-accent">
                  {PROGRESS_METRIC_LABELS[chosen]}
                </span>
                <b className="font-display text-display-page uppercase italic leading-none">
                  {formatMetricValue(chosen, last.value)}
                </b>
                <span className="text-sm text-muted">
                  {formatProgressTrend(points, chosen) ??
                    "Une seule séance pour l'instant"}
                </span>
              </div>
            )}

            {points.length < 2 ? (
              <p className="rounded-card border border-base-300 bg-base-100 p-4 text-sm text-muted shadow-card">
                La courbe apparaîtra dès la 2ᵉ séance.
              </p>
            ) : (
              chosen !== null && (
                <ProgressChart points={points} metric={chosen} />
              )
            )}

            <RecordGrid records={blocks} />

            {records.one_rep_max !== null && (
              <p className="text-xs leading-[1.45] text-muted">
                1RM estimée (formule d'Epley) à partir des séries de 10
                répétitions ou moins.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ExerciseProgressPage;
