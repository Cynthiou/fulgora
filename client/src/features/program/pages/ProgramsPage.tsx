import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  computeProgramStatus,
  formatPeriodShort,
  PROGRAM_STATUS_LABELS,
  todayInParis,
} from "shared";
import gridIcon from "../../../assets/icons/ui/app/grid.svg";
import pencilIcon from "../../../assets/icons/ui/app/pencil.svg";
import plusIcon from "../../../assets/icons/ui/app/plus.svg";
import trashIcon from "../../../assets/icons/ui/app/trash.svg";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
import LoadingState from "../../../components/LoadingState";
import PageHeader from "../../../components/PageHeader";
import { isAbortError } from "../../../services/api";
import {
  deleteProgramDraft,
  type ProgramListItem,
  readPrograms,
} from "../services/programService";

const PRIMARY_LINK =
  "flex h-btn w-full items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action";

// The chip of each state of a program (PRO-01).
const STATUS_CHIP: Record<string, string> = {
  draft: "bg-neutral/[0.06] text-muted",
  upcoming: "bg-secondary/10 text-secondary",
  in_progress: "bg-primary/10 text-action-text",
  finished: "bg-status-done/10 text-status-done-text",
  abandoned: "bg-status-cancelled/10 text-status-cancelled-text",
};

// The chips over the list: every state, plus "Tous" (PRO-01).
const FILTERS = [
  { code: "all", label: "Tous" },
  { code: "in_progress", label: "En cours" },
  { code: "programmed", label: "À venir" },
  { code: "finished", label: "Terminés" },
  { code: "abandoned", label: "Abandonnés" },
] as const;

type FilterCode = (typeof FILTERS)[number]["code"];

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
  const location = useLocation();
  // "Programme supprimé.", handed over by PRO-11c (US-21)
  const flash = (location.state as { flash?: string } | null)?.flash ?? null;
  const today = todayInParis();
  const [items, setItems] = useState<ProgramListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState<FilterCode>("all");
  const [removing, setRemoving] = useState<number | null>(null);

  // A draft is thrown away from the list itself (PRO-01b, RM-071).
  async function remove(id: number) {
    setRemoving(id);
    try {
      await deleteProgramDraft(id);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch {
      setError("Impossible de supprimer ce brouillon.");
    } finally {
      setRemoving(null);
    }
  }

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

  // A draft always stays in the list: it is the first thing to finish
  // (RM-071).
  const shown =
    filter === "all"
      ? items
      : items.filter((item) => computeProgramStatus(item, today) === filter);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <PageHeader
        onBack={() => navigate("/planning")}
        title="Mes programmes"
        subtitle={
          isLoading || items.length === 0
            ? undefined
            : describeList(items, today)
        }
      />

      <div className="flex flex-1 flex-col gap-2.5 px-[18px] pt-1 pb-24">
        {flash !== null && (
          <p
            role="status"
            className="rounded-card bg-pick px-4 py-3.5 text-sm font-semibold text-pick-content shadow-hero"
          >
            {flash}
          </p>
        )}
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
            centered
            icon={gridIcon}
            title="Aucun programme"
            message="Un programme planifie tes séances sur plusieurs semaines, automatiquement. Choisis la période et tes jours, les séances arrivent dans ton Planning."
          >
            <Link to="/programmes/nouveau" className={PRIMARY_LINK}>
              <Icon src={plusIcon} className="size-[18px]" />
              Créer mon premier programme
            </Link>
          </EmptyState>
        )}

        {!isLoading && error === null && items.length > 0 && (
          <div
            role="tablist"
            aria-label="Filtrer les programmes"
            className="-mx-[18px] flex gap-1.5 overflow-x-auto px-[18px] pb-0.5"
          >
            {FILTERS.map((item) => (
              <button
                key={item.code}
                type="button"
                role="tab"
                aria-selected={filter === item.code}
                onClick={() => setFilter(item.code)}
                className={`flex h-8 shrink-0 items-center rounded-full px-3 text-xs font-bold ${
                  filter === item.code
                    ? "bg-pick text-pick-content"
                    : "border border-base-300 bg-base-100 shadow-card"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {!isLoading &&
          error === null &&
          shown.length === 0 &&
          items.length > 0 && (
            <p className="pt-2 text-sm text-muted">
              Aucun programme dans cet état.
            </p>
          )}

        {!isLoading && error === null && shown.length > 0 && (
          <ul className="flex flex-col gap-2.5">
            {shown.map((item) => {
              const status = computeProgramStatus(item, today);
              const isDraft = status === "draft";
              const ready =
                item.session_count === 0
                  ? 0
                  : Math.round((item.ready_count / item.session_count) * 100);
              return (
                <li key={item.id}>
                  <div
                    className={`flex flex-col gap-2 rounded-card bg-base-100 p-3.5 ${
                      isDraft
                        ? "border border-dashed border-primary/60"
                        : "border border-base-300 shadow-card"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <Link
                        to={
                          isDraft
                            ? `/programmes/${item.id}/seances`
                            : `/programmes/${item.id}`
                        }
                        className="min-w-0 flex-1 truncate text-base font-extrabold"
                      >
                        {item.name}
                      </Link>
                      <span
                        className={`shrink-0 rounded-chip px-2 py-[3px] text-[10px] font-extrabold uppercase tracking-[0.06em] ${
                          STATUS_CHIP[status] ?? ""
                        }`}
                      >
                        {PROGRAM_STATUS_LABELS[status]}
                      </span>
                    </span>
                    <span className="text-xs font-semibold leading-[1.45] text-muted">
                      {formatPeriodShort(item.start_date, item.end_date)}
                    </span>
                    {isDraft ? (
                      // A draft shows how far it is from being usable
                      // (RM-071); the mockup draws the same bar (PRO-01b).
                      <span className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="h-1.5 flex-1 overflow-hidden rounded-chip bg-track"
                        >
                          <span
                            className="block h-full bg-secondary"
                            style={{ width: `${ready}%` }}
                          />
                        </span>
                        <span className="shrink-0 text-[11.5px] font-bold leading-[1.45] text-muted">
                          {item.ready_count} / {item.session_count} séances
                          prêtes
                        </span>
                      </span>
                    ) : (
                      // How far the program has gone (PRO-01)
                      <span className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="h-1.5 flex-1 overflow-hidden rounded-chip bg-track"
                        >
                          <span
                            className="block h-full bg-secondary"
                            style={{
                              width: `${
                                item.appointment_count === 0
                                  ? 0
                                  : Math.round(
                                      (item.past_count /
                                        item.appointment_count) *
                                        100,
                                    )
                              }%`,
                            }}
                          />
                        </span>
                        <span className="shrink-0 text-[11.5px] font-bold leading-[1.45] text-muted">
                          {item.past_count} / {item.appointment_count} séances
                        </span>
                      </span>
                    )}

                    {isDraft && (
                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => remove(item.id)}
                          disabled={removing === item.id}
                          className="flex h-11 items-center justify-center gap-2 rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card disabled:opacity-60"
                        >
                          <Icon src={trashIcon} className="size-4" />
                          Supprimer
                        </button>
                        <Link
                          to={`/programmes/${item.id}/seances`}
                          className="flex h-11 items-center justify-center gap-2 rounded-btn border border-secondary text-sm font-bold text-secondary"
                        >
                          <Icon src={pencilIcon} className="size-4" />
                          Reprendre
                        </Link>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!isLoading && error === null && items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 px-[18px] pt-3 pb-1">
          <div className="mx-auto max-w-md">
            <Link to="/programmes/nouveau" className={PRIMARY_LINK}>
              <Icon src={plusIcon} className="size-[18px]" />
              Créer un programme
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProgramsPage;
