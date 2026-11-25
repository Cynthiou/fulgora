import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  computeProgramStatus,
  formatPeriod,
  PROGRAM_STATUS_LABELS,
  todayInParis,
} from "shared";
import chevronLeftIcon from "../../../assets/icons/ui/chevrons/chevron-left.svg";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
import LoadingState from "../../../components/LoadingState";
import { isAbortError } from "../../../services/api";
import { type ProgramListItem, readPrograms } from "../services/programService";

const PRIMARY_LINK =
  "flex h-btn w-full items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action";

// "4 programmes · 2 en cours · 1 brouillon" (PRO-01b).
function describeList(items: ProgramListItem[], today: string): string {
  const running = items.filter(
    (item) => computeProgramStatus(item, today) === "in_progress",
  ).length;
  const drafts = items.filter((item) => item.status === "draft").length;
  const parts = [`${items.length} programme${items.length > 1 ? "s" : ""}`];
  if (running > 0) {
    parts.push(`${running} en cours`);
  }
  if (drafts > 0) {
    parts.push(`${drafts} brouillon${drafts > 1 ? "s" : ""}`);
  }
  return parts.join(" · ");
}

// Screens PRO-01, PRO-01b and PRO-01v: "Mes programmes" is a page, not a
// tab (RM-066). A draft comes first and says how many of its sessions are
// ready (RM-071).
function ProgramsPage() {
  const navigate = useNavigate();
  const today = todayInParis();
  const [items, setItems] = useState<ProgramListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is listed on purpose, it re-runs the load
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    readPrograms(controller.signal)
      .then((data) => {
        setItems(data);
        setIsLoading(false);
      })
      .catch((caught: unknown) => {
        if (isAbortError(caught)) {
          return;
        }
        setError("Impossible de charger tes programmes.");
        setIsLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-base-300 bg-base-100 px-2">
        <button
          type="button"
          onClick={() => navigate("/planning")}
          aria-label="Retour"
          className="flex size-tap items-center justify-center rounded-btn text-secondary"
        >
          <Icon src={chevronLeftIcon} className="size-7" />
        </button>
        <h1 className="text-display-sm">Mes programmes</h1>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        {isLoading && <LoadingState label="Chargement des programmes…" />}

        {!isLoading && error !== null && (
          <ErrorState
            title={error}
            message="Vérifie ta connexion internet, puis réessaie."
            onRetry={() => setAttempt((count) => count + 1)}
          />
        )}

        {!isLoading && error === null && items.length === 0 && (
          <EmptyState
            title="Aucun programme"
            message="Un programme planifie tes séances sur plusieurs semaines, automatiquement. Choisis la période et tes jours, les séances arrivent dans ton Planning."
          >
            <Link to="/programmes/nouveau" className={PRIMARY_LINK}>
              + Créer mon premier programme
            </Link>
          </EmptyState>
        )}

        {!isLoading && error === null && items.length > 0 && (
          <>
            <p className="font-semibold">{describeList(items, today)}</p>
            <ul className="flex flex-col gap-2">
              {items.map((item) => {
                const status = computeProgramStatus(item, today);
                const isDraft = status === "draft";
                return (
                  <li key={item.id}>
                    <Link
                      to={
                        isDraft
                          ? `/programmes/${item.id}/seances`
                          : `/programmes/${item.id}`
                      }
                      className="flex flex-col gap-1 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
                    >
                      <span className="text-overline uppercase text-accent">
                        {PROGRAM_STATUS_LABELS[status]}
                      </span>
                      <span className="font-display text-display-sm">
                        {item.name}
                      </span>
                      <span className="text-sm text-muted">
                        {formatPeriod(item.start_date, item.end_date)}
                      </span>
                      <span className="text-sm text-muted">
                        {isDraft
                          ? `${item.ready_count} / ${item.session_count} séances prêtes · pas encore dans le Planning`
                          : `${item.appointment_count} séances dans le Planning`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link to="/programmes/nouveau" className={PRIMARY_LINK}>
              + Créer un programme
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default ProgramsPage;
