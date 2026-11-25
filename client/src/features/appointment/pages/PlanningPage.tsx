import { Link, useSearchParams } from "react-router";
import {
  addDays,
  buildDayEntries,
  type DayEntry,
  dateSchema,
  formatDayCount,
  formatLongDate,
  formatMonthTitle,
  getAppointmentDisplayDate,
  isWorkoutOver,
  shiftMonth,
  todayInParis,
  toYearMonth,
} from "shared";
import chevronLeftIcon from "../../../assets/icons/ui/chevrons/chevron-left.svg";
import chevronRightIcon from "../../../assets/icons/ui/chevrons/chevron-right.svg";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
import LoadingState from "../../../components/LoadingState";
import AlreadyInProgressDialog from "../../workout-session/components/AlreadyInProgressDialog";
import { useStartWorkout } from "../../workout-session/hooks/useStartWorkout";
import AppointmentRow from "../components/AppointmentRow";
import CreateChoiceSheet from "../components/CreateChoiceSheet";
import DayView from "../components/DayView";
import MonthGrid from "../components/MonthGrid";
import PlanningLegend from "../components/PlanningLegend";
import WeekList from "../components/WeekList";
import { useAppointments } from "../hooks/useAppointments";

const VIEWS = [
  { code: "jour", label: "Jour" },
  { code: "semaine", label: "Semaine" },
  { code: "mois", label: "Mois" },
] as const;

type ViewCode = (typeof VIEWS)[number]["code"];

function readView(raw: string | null): ViewCode {
  return VIEWS.some((view) => view.code === raw) ? (raw as ViewCode) : "mois";
}

function readDay(raw: string | null, today: string): string {
  return raw !== null && dateSchema.safeParse(raw).success ? raw : today;
}

// The Monday of the week holding the day.
function startOfWeek(day: string): string {
  const weekday = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(day, -weekday);
}

// The period to ask the server for, wide enough to fill the view and to
// find the next session of the day view.
function readRange(view: ViewCode, day: string): [string, string] {
  if (view === "mois") {
    const month = toYearMonth(day);
    const firstOfNext = `${shiftMonth(month, 1)}-01`;
    return [addDays(`${month}-01`, -7), addDays(firstOfNext, 7)];
  }
  if (view === "semaine") {
    const monday = startOfWeek(day);
    return [addDays(monday, -1), addDays(monday, 7)];
  }
  return [addDays(day, -1), addDays(day, 30)];
}

// Screens CAL-01, CAL-02 and CAL-03: the Planning, in three views. The view
// and the selected day live in the address, so a reload or a back keeps them.
function PlanningPage() {
  const today = todayInParis();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = readView(searchParams.get("vue"));
  const day = readDay(searchParams.get("jour"), today);
  const month = toYearMonth(day);
  const [from, to] = readRange(view, day);
  const { items, isLoading, error, reload } = useAppointments(from, to);
  const start = useStartWorkout();

  function go(nextView: ViewCode, nextDay: string) {
    setSearchParams({ vue: nextView, jour: nextDay }, { replace: true });
  }

  // ‹ and ›: another month, another week, another day.
  function step(direction: -1 | 1) {
    if (view === "mois") {
      const shifted = shiftMonth(month, direction);
      go(view, `${shifted}-01`);
    } else if (view === "semaine") {
      go(view, addDays(day, direction * 7));
    } else {
      go(view, addDays(day, direction));
    }
  }

  const entries = buildDayEntries(items, day);
  // The session in progress, whatever its day: nothing else starts (RM-040).
  const running = items.find(
    (item) =>
      item.workout_session !== null &&
      item.workout_session.status === "in_progress",
  );

  // The first session to come after an empty day (CAL-03e).
  const nextEntry: DayEntry | null =
    entries.length > 0
      ? null
      : (items
          .filter(
            (item) =>
              getAppointmentDisplayDate(item) > day &&
              !isWorkoutOver(item) &&
              item.status !== "cancelled",
          )
          .sort((a, b) =>
            getAppointmentDisplayDate(a) < getAppointmentDisplayDate(b)
              ? -1
              : 1,
          )
          .map((item) => ({ item, isReminder: false }))[0] ?? null);

  const title =
    view === "mois"
      ? formatMonthTitle(month)
      : view === "semaine"
        ? `${Number(startOfWeek(day).slice(8, 10))} → ${formatLongDate(
            addDays(startOfWeek(day), 6),
          )
            .split(" ")
            .slice(1)
            .join(" ")}`
        : day === today
          ? "Aujourd'hui"
          : formatLongDate(day);

  // "Jeudi 26 novembre · 4 séances · 1 effectuée" under "Aujourd'hui";
  // only the count when the title already carries the date (CAL-03h).
  const subtitle =
    view === "jour"
      ? [day === today ? formatLongDate(day) : null, formatDayCount(entries)]
          .filter((part): part is string => part !== null)
          .join(" · ")
      : null;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-display-md">Planning</h1>
        <Link
          to="/programmes"
          className="min-h-tap font-semibold text-secondary underline"
        >
          Mes programmes
        </Link>
      </div>

      <div
        role="tablist"
        aria-label="Vue du planning"
        className="grid grid-cols-3 overflow-hidden rounded-btn border border-base-300"
      >
        {VIEWS.map((item) => (
          <button
            key={item.code}
            type="button"
            role="tab"
            aria-selected={view === item.code}
            onClick={() => go(item.code, day)}
            className={`min-h-tap px-2 font-semibold ${
              view === item.code
                ? "bg-neutral text-neutral-content"
                : "bg-base-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label={
            view === "mois"
              ? "Mois précédent"
              : view === "semaine"
                ? "Semaine précédente"
                : "Jour précédent"
          }
          className="flex size-tap items-center justify-center rounded-btn border border-base-300 text-secondary"
        >
          <Icon src={chevronLeftIcon} className="size-5" />
        </button>
        <div className="flex min-w-0 flex-col items-center">
          <p className="truncate font-display text-display-sm">{title}</p>
          {subtitle !== null && (
            <p className="truncate text-sm text-muted">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label={
            view === "mois"
              ? "Mois suivant"
              : view === "semaine"
                ? "Semaine suivante"
                : "Jour suivant"
          }
          className="flex size-tap items-center justify-center rounded-btn border border-base-300 text-secondary"
        >
          <Icon src={chevronRightIcon} className="size-5" />
        </button>
      </div>

      {day !== today && (
        <button
          type="button"
          onClick={() => go(view, today)}
          className="min-h-tap self-center font-semibold text-secondary underline"
        >
          <span aria-hidden="true">↩ </span>Revenir à aujourd'hui
        </button>
      )}

      {isLoading && <LoadingState label="Chargement du planning…" />}

      {!isLoading && error !== null && (
        <ErrorState
          title="Impossible de charger ton planning."
          message="Vérifie ta connexion internet, puis réessaie."
          onRetry={reload}
        />
      )}

      {!isLoading && error === null && (
        <>
          {view === "mois" && (
            <>
              <MonthGrid
                yearMonth={month}
                selectedDay={day}
                today={today}
                items={items}
                onSelect={(picked) => go("mois", picked)}
              />
              <PlanningLegend />
              <section
                aria-labelledby="day-title"
                className="flex flex-col gap-2"
              >
                <h2 id="day-title" className="text-display-sm">
                  {formatLongDate(day)} · {formatDayCount(entries)}
                </h2>
                {entries.length === 0 ? (
                  <p className="text-muted">Aucune séance ce jour-là.</p>
                ) : (
                  <ul className="overflow-hidden rounded-card border border-base-300 bg-base-100 shadow-card">
                    {entries.map((entry) => (
                      <AppointmentRow
                        key={`${entry.item.id}-${entry.isReminder}`}
                        entry={entry}
                      />
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}

          {view === "semaine" && (
            <WeekList
              weekStart={startOfWeek(day)}
              today={today}
              items={items}
              onPickDay={(picked) => go("jour", picked)}
            />
          )}

          {view === "jour" && (
            <DayView
              day={day}
              today={today}
              items={items}
              nextEntry={nextEntry}
              isStarting={start.isStarting}
              startError={start.error}
              isAnotherInProgress={running !== undefined}
              onStart={start.start}
            />
          )}
        </>
      )}

      <CreateChoiceSheet date={day} />

      {start.inProgress !== null && (
        <AlreadyInProgressDialog
          current={start.inProgress}
          onClose={start.closeInProgress}
        />
      )}
    </div>
  );
}

export default PlanningPage;
