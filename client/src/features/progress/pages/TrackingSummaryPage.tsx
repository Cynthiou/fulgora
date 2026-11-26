import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  addDays,
  describeRegularity,
  formatDayMonth,
  formatDelta,
  formatDuration,
  formatPlannedCount,
  formatSummaryLabel,
  formatTonnage,
  SUMMARY_PERIOD_LABELS,
  SUMMARY_PERIODS,
  type SummaryPeriod,
  shiftMonth,
  type TrackingSummary,
  todayInParis,
} from "shared";
import chevronLeftIcon from "../../../assets/icons/ui/app/chevron-left.svg";
import chevronRightIcon from "../../../assets/icons/ui/app/chevron-right.svg";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
import { isAbortError } from "../../../services/api";
import TrackingTabs from "../../history/components/TrackingTabs";
import {
  type ProgramListItem,
  readPrograms,
} from "../../program/services/programService";
import MuscleSetsCard from "../components/MuscleSetsCard";
import { readTrackingSummary } from "../services/progressService";

const SKELETON_KEYS = ["a", "b", "c"];

// Grey cards of the same size while the summary loads (SUI-01b).
function SummarySkeleton() {
  return (
    <div role="status" className="flex flex-col gap-2.5">
      <span className="sr-only">Chargement de ton suivi</span>
      {SKELETON_KEYS.map((key) => (
        <div
          key={key}
          className="h-32 animate-pulse rounded-card bg-soft motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

// Screens SUI-01 to SUI-04: the summary of the week, of the month or of a
// program. Every figure comes from the same place as the Planning and the
// history (RM-076, RM-077).
function TrackingSummaryPage() {
  const today = todayInParis();
  const [searchParams, setSearchParams] = useSearchParams();
  const period = (searchParams.get("periode") ?? "week") as SummaryPeriod;
  const date = searchParams.get("date") ?? today;
  const programId = searchParams.get("programme");
  const [summary, setSummary] = useState<TrackingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [programs, setPrograms] = useState<ProgramListItem[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    readPrograms(controller.signal)
      .then(setPrograms)
      .catch(() => setPrograms([]));
    return () => controller.abort();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is listed on purpose, it re-runs the load
  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    readTrackingSummary(
      {
        period,
        date,
        programId: programId === null ? null : Number(programId),
      },
      controller.signal,
    )
      .then(setSummary)
      .catch((caught: unknown) => {
        if (!isAbortError(caught)) {
          setError("Impossible de charger ton suivi");
        }
      });
    return () => controller.abort();
  }, [period, date, programId, attempt]);

  function go(next: {
    period?: SummaryPeriod;
    date?: string;
    programId?: string | null;
  }) {
    const params = new URLSearchParams();
    const chosen = next.period ?? period;
    params.set("periode", chosen);
    if (chosen !== "program") {
      params.set("date", next.date ?? date);
    }
    const program = next.programId === undefined ? programId : next.programId;
    if (chosen === "program" && program !== null) {
      params.set("programme", program);
    }
    setSearchParams(params, { replace: true });
  }

  function step(direction: -1 | 1) {
    go({
      date:
        period === "week"
          ? addDays(date, direction * 7)
          : `${shiftMonth(date.slice(0, 7), direction)}-01`,
    });
  }

  const regularity = summary?.regularity ?? null;
  const isEmpty =
    summary !== null &&
    summary.regularity.planned === 0 &&
    summary.work.sessions === 0;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-2.5 px-[18px] pt-1 pb-3.5">
      <h1 className="sr-only">Suivi</h1>
      <TrackingTabs current="resume" />

      <div className="flex flex-wrap gap-2">
        {SUMMARY_PERIODS.map((one) => (
          <button
            key={one}
            type="button"
            aria-pressed={one === period}
            disabled={one === "program" && programs.length === 0}
            onClick={() =>
              go({
                period: one,
                programId:
                  one === "program"
                    ? (programId ?? String(programs[0]?.id ?? ""))
                    : null,
              })
            }
            className={`h-9 rounded-chip px-3.5 text-[13px] font-bold disabled:opacity-60 ${
              one === period
                ? "bg-pick text-pick-content"
                : "border border-base-300 bg-base-100 shadow-card"
            }`}
          >
            {SUMMARY_PERIOD_LABELS[one]}
          </button>
        ))}
      </div>

      {period === "program" && programs.length > 1 && (
        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-overline uppercase not-italic text-accent">
            Programme
          </span>
          <select
            value={programId ?? ""}
            onChange={(event) => go({ programId: event.target.value })}
            className="h-field w-full rounded-btn border border-base-300 bg-base-100 px-4 text-[15px] shadow-card"
          >
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {period !== "program" && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Période précédente"
            className="grid size-tap place-items-center rounded-btn border border-base-300 bg-base-100"
          >
            <Icon src={chevronLeftIcon} className="size-[18px]" />
          </button>
          <p className="font-display text-display-xs uppercase italic">
            {summary === null ? "…" : formatSummaryLabel(summary)}
          </p>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Période suivante"
            className="grid size-tap place-items-center rounded-btn border border-base-300 bg-base-100"
          >
            <Icon src={chevronRightIcon} className="size-[18px]" />
          </button>
        </div>
      )}

      {error !== null && (
        <ErrorState
          title={error}
          message="Vérifie ta connexion, puis réessaie."
          onRetry={() => setAttempt((count) => count + 1)}
        />
      )}

      {summary === null && error === null && <SummarySkeleton />}

      {isEmpty && (
        <EmptyState
          title="Ton suivi commencera après ta première séance"
          message="Tes séances faites, tes records et les muscles travaillés apparaîtront ici."
        >
          <Link
            to="/planning"
            className="flex h-13 items-center justify-center rounded-btn border border-base-300 bg-base-100 px-4 text-sm font-bold shadow-card"
          >
            Voir mon planning
          </Link>
        </EmptyState>
      )}

      {summary !== null && regularity !== null && !isEmpty && (
        <>
          {summary.program !== null && (
            <section className="flex flex-col gap-1 rounded-card border border-base-300 bg-base-100 p-4 shadow-card">
              <span className="font-sans text-overline uppercase not-italic text-accent">
                {summary.program.name}
              </span>
              <b className="font-display text-display-xs uppercase italic">
                {formatSummaryLabel(summary)}
              </b>
              <p className="text-sm text-muted">
                {`Assiduité : ${summary.program.done_count} / ${summary.program.past_count} séances passées faites`}
              </p>
              <p className="text-sm text-muted">
                {`Progression : ${summary.program.percent} %`}
              </p>
            </section>
          )}

          <section
            aria-labelledby="regularity-title"
            className="flex flex-col gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="regularity-title" className="text-display-xs">
                Régularité
              </h2>
              <p className="text-xs font-semibold text-muted">
                {formatPlannedCount(regularity.planned)}
              </p>
            </div>
            <p className="font-display text-display-page uppercase italic leading-none">
              {regularity.done}
              <span className="text-display-xs text-muted">
                {` / ${regularity.planned} faites`}
              </span>
            </p>
            <div
              aria-hidden="true"
              className="h-1.5 overflow-hidden rounded-chip bg-track"
            >
              <div
                className="h-full rounded-chip bg-secondary"
                style={{
                  width: `${
                    regularity.planned === 0
                      ? 0
                      : Math.round((regularity.done / regularity.planned) * 100)
                  }%`,
                }}
              />
            </div>
            <ul className="flex flex-col gap-1">
              {describeRegularity(regularity).map((line) => (
                <li
                  key={line.label}
                  className="flex items-baseline justify-between gap-2 text-sm"
                >
                  <span className="text-muted">{line.label}</span>
                  <b>{line.value}</b>
                </li>
              ))}
            </ul>
            {regularity.moved > 0 && (
              <p className="text-xs text-muted">
                {`↷ ${regularity.moved} décalée${
                  regularity.moved > 1 ? "s" : ""
                } · déjà comptée${
                  regularity.moved > 1 ? "s" : ""
                } dans son statut`}
              </p>
            )}
          </section>

          <section
            aria-labelledby="work-title"
            className="flex flex-col gap-2 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
          >
            <h2 id="work-title" className="text-display-xs">
              Travail
            </h2>
            <p className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-muted">
                {summary.work.sessions > 1 ? "Séances" : "Séance"}
              </span>
              <b>
                {summary.work.sessions}
                {summary.comparison !== null && (
                  <span className="ml-2 text-xs font-semibold text-muted">
                    {formatDelta(
                      summary.work.sessions - summary.comparison.work.sessions,
                    )}
                  </span>
                )}
              </b>
            </p>
            <p className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-muted">Temps</span>
              <b>{formatDuration(summary.work.duration_seconds)}</b>
            </p>
            {summary.work.tonnage_kg === null ? (
              <p className="text-xs text-muted">
                Le tonnage n'apparaît qu'avec des charges.
              </p>
            ) : (
              <p className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-muted">Tonnage</span>
                <b>{formatTonnage(summary.work.tonnage_kg)}</b>
              </p>
            )}
            {summary.comparison !== null && (
              <p className="text-xs text-muted">
                {`Comparé à la même durée du mois précédent (${formatDayMonth(
                  summary.comparison.from,
                )} → ${formatDayMonth(summary.comparison.to)}).`}
              </p>
            )}
          </section>

          <MuscleSetsCard muscles={summary.muscles} />

          {summary.records.length > 0 && (
            <section
              aria-labelledby="records-title"
              className="flex flex-col gap-2 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
            >
              <h2 id="records-title" className="text-display-xs">
                Records récents
              </h2>
              <ul className="flex flex-col gap-1.5">
                {summary.records.map((record) => (
                  <li key={`${record.exercise_id}-${record.date}`}>
                    <Link
                      to={`/suivi/exercices/${record.exercise_id}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {record.message ?? record.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted">
                        {formatDayMonth(record.date)}
                      </span>
                      <Icon
                        src={chevronRightIcon}
                        className="size-4 shrink-0 text-faint"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default TrackingSummaryPage;
