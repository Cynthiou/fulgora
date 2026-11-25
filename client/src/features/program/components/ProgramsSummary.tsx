import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  computeProgramStatus,
  countProgramWeeks,
  formatDayMonth,
  todayInParis,
} from "shared";
import { isAbortError } from "../../../services/api";
import { type ProgramListItem, readPrograms } from "../services/programService";

// Which week of the program today falls in, from 1 to the number of weeks.
function currentWeek(program: ProgramListItem, today: string): number {
  const start = Date.parse(`${program.start_date}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  const days = Math.floor((now - start) / 86_400_000);
  return Math.min(
    countProgramWeeks(program.start_date, program.end_date),
    Math.max(1, Math.floor(days / 7) + 1),
  );
}

// Screen 03-2: "Mes programmes" on the home page. The program in progress
// shows its week bars, one per week: filled for the weeks gone by, ringed
// for the current one, grey for the ones to come.
function ProgramsSummary() {
  const today = todayInParis();
  const [items, setItems] = useState<ProgramListItem[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    readPrograms(controller.signal)
      .then(setItems)
      .catch((caught: unknown) => {
        if (!isAbortError(caught)) {
          // The section simply shows the invitation.
          setItems([]);
        }
      });
    return () => controller.abort();
  }, []);

  const running = (items ?? []).find(
    (item) => computeProgramStatus(item, today) === "in_progress",
  );

  if (running === undefined) {
    // Screen 03-1: no program yet.
    return (
      <section
        aria-labelledby="programs-title"
        className="flex flex-col gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
      >
        <h2
          id="programs-title"
          className="font-sans text-overline not-italic uppercase text-accent"
        >
          Mes programmes
        </h2>
        <p className="text-sm leading-[1.45] text-muted">
          Aucun programme en cours. Un programme planifie tes séances sur
          plusieurs semaines.
        </p>
        <Link
          to="/programmes/nouveau"
          className="flex h-[50px] items-center justify-center rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card"
        >
          Créer un programme
        </Link>
      </section>
    );
  }

  const weeks = countProgramWeeks(running.start_date, running.end_date);
  const week = currentWeek(running, today);

  return (
    <section aria-labelledby="programs-title" className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="programs-title" className="text-display-sm">
          Mes programmes
        </h2>
        <Link
          to="/programmes"
          className="text-[13px] font-semibold text-secondary"
        >
          Voir tout
        </Link>
      </div>
      <Link
        to={`/programmes/${running.id}`}
        className="flex flex-col gap-2.5 rounded-hero border border-base-300 bg-base-100 px-4 py-3.5 shadow-card"
      >
        <span className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate text-[15px] font-bold">
            {running.name}
          </span>
          <span className="shrink-0 text-xs font-bold text-muted">
            S{week} / {weeks}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}
        >
          {Array.from({ length: weeks }, (_, index) => index + 1).map(
            (number) => (
              <span
                key={number}
                className={`h-1.5 rounded-[2px] ${
                  number < week
                    ? "bg-secondary"
                    : number === week
                      ? "bg-secondary/40 ring-1 ring-inset ring-secondary"
                      : "bg-neutral/[0.06]"
                }`}
              />
            ),
          )}
        </span>
        <span className="text-xs font-medium text-muted">
          {formatDayMonth(running.start_date)} →{" "}
          {formatDayMonth(running.end_date)}
        </span>
        <span className="sr-only">
          Semaine {week} sur {weeks}
        </span>
      </Link>
    </section>
  );
}

export default ProgramsSummary;
