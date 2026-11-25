import { Link } from "react-router";
import {
  type AppointmentListItem,
  buildDayEntries,
  type DayEntry,
  formatLongDate,
  getAppointmentStatus,
  isWorkoutOver,
} from "shared";
import ErrorState from "../../../components/ErrorState";
import AppointmentRow from "./AppointmentRow";

type Props = {
  day: string;
  today: string;
  items: AppointmentListItem[];
  // The next session of the coming days, shown when the day is empty
  nextEntry: DayEntry | null;
  isStarting: boolean;
  startError: string | null;
  // True while another session is running: no start anywhere else (RM-040)
  isAnotherInProgress: boolean;
  onStart: (appointmentId: number) => void;
};

const PRIMARY_BUTTON =
  "flex h-btn w-full items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action disabled:opacity-60";

// Screens CAL-03, CAL-03e and CAL-03h: one day and its sessions. The next
// session to do is flagged "À suivre" and is the only one with a start
// button; the others start from their own detail.
function DayView({
  day,
  today,
  items,
  nextEntry,
  isStarting,
  startError,
  isAnotherInProgress,
  onStart,
}: Props) {
  const entries = buildDayEntries(items, day);
  const isToday = day === today;
  const isPast = day < today;

  // The first session of the day that can still be started (RM-069).
  const next = entries.find(
    (entry) =>
      !entry.isReminder &&
      !isWorkoutOver(entry.item) &&
      entry.item.status !== "cancelled" &&
      entry.item.exercise_count > 0,
  );
  const toConfirm = entries.filter(
    (entry) => getAppointmentStatus(entry.item) === "to_confirm",
  );

  if (entries.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-base-300 p-6 text-center">
          <p className="font-display text-display-sm">
            {isToday ? "Rien de prévu aujourd'hui" : "Rien de prévu ce jour-là"}
          </p>
          <p className="text-muted">
            Ajoute une séance libre ou démarre un programme.
          </p>
          <Link
            to={`/seances/nouvelle?date=${day}`}
            className={`${PRIMARY_BUTTON} no-underline`}
          >
            + Créer une séance
          </Link>
        </div>

        {nextEntry !== null && (
          <section
            aria-labelledby="next-session"
            className="flex flex-col gap-2"
          >
            <h2
              id="next-session"
              className="font-sans text-overline not-italic uppercase text-accent"
            >
              Prochaine séance
            </h2>
            <ul className="overflow-hidden rounded-card border border-base-300 bg-base-100 shadow-card">
              <AppointmentRow entry={nextEntry} showTime={false} />
            </ul>
            <p className="text-sm text-muted">
              {formatLongDate(nextEntry.item.planned_date).toLocaleLowerCase(
                "fr-FR",
              )}
            </p>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="overflow-hidden rounded-card border border-base-300 bg-base-100 shadow-card">
        {entries.map((entry) => (
          <AppointmentRow
            key={`${entry.item.id}-${entry.isReminder}`}
            entry={entry}
            isNext={entry === next && !isPast}
          />
        ))}
      </ul>

      {startError !== null && <ErrorState title={startError} />}

      {next !== undefined && !isPast && (
        <>
          {isAnotherInProgress ? (
            <p className="text-center font-semibold text-muted">
              Une séance est en cours
            </p>
          ) : (
            <button
              type="button"
              disabled={isStarting}
              onClick={() => onStart(next.item.id)}
              className={PRIMARY_BUTTON}
            >
              {isStarting ? (
                "Démarrage…"
              ) : (
                <>
                  <span aria-hidden="true">{"▶ "}</span>
                  Démarrer {next.item.session_name}
                </>
              )}
            </button>
          )}
          <p className="text-center text-sm text-muted">
            La prochaine séance prévue. Les autres se démarrent depuis leur
            détail.
          </p>
        </>
      )}

      {isPast && toConfirm.length > 0 && (
        <p className="text-center text-sm text-muted">
          Touche une séance pour dire si tu l'as faite.
        </p>
      )}
    </div>
  );
}

export default DayView;
