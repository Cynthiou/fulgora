import { Link } from "react-router";
import {
  type AppointmentListItem,
  buildDayEntries,
  type DayEntry,
  getAppointmentStatus,
  isWorkoutOver,
} from "shared";
import calendarIcon from "../../../assets/icons/ui/app/calendar.svg";
import playIcon from "../../../assets/icons/ui/app/play.svg";
import plusIcon from "../../../assets/icons/ui/app/plus.svg";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
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

// The one orange button of the screen (CAL-03, CAL-03e).
const PRIMARY_BUTTON =
  "flex h-btn w-full items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60";

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
      <div className="flex flex-col gap-2.5">
        <EmptyState
          centered
          icon={calendarIcon}
          title={
            isToday ? "Rien de prévu aujourd'hui" : "Rien de prévu ce jour-là"
          }
          message="Ajoute une séance libre ou démarre un programme."
        >
          <Link
            to={`/seances/nouvelle?date=${day}`}
            className={`${PRIMARY_BUTTON} no-underline`}
          >
            <Icon src={plusIcon} className="size-[18px]" />
            Créer une séance
          </Link>
        </EmptyState>

        {nextEntry !== null && (
          <section
            aria-labelledby="next-session"
            className="flex flex-col gap-1.5"
          >
            <h2
              id="next-session"
              className="font-sans text-overline uppercase not-italic text-muted"
            >
              Prochaine séance
            </h2>
            <ul>
              <AppointmentRow entry={nextEntry} withDate />
            </ul>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <ul className="flex flex-col gap-2.5">
        {entries.map((entry) =>
          entry === next && !isPast ? (
            // The session to come is announced, then ringed in blue (CAL-03).
            <li
              key={`${entry.item.id}-${entry.isReminder}`}
              className="flex flex-col gap-1.5"
            >
              <span className="font-sans text-overline uppercase not-italic text-action-text">
                À suivre
              </span>
              <ul>
                <AppointmentRow entry={entry} isNext />
              </ul>
            </li>
          ) : (
            <AppointmentRow
              key={`${entry.item.id}-${entry.isReminder}`}
              entry={entry}
            />
          ),
        )}
      </ul>

      {startError !== null && <ErrorState title={startError} />}

      {next !== undefined &&
        !isPast &&
        (isAnotherInProgress ? (
          <p className="text-center text-sm font-semibold text-muted">
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
                <Icon src={playIcon} className="size-[18px]" />
                Démarrer {next.item.session_name}
              </>
            )}
          </button>
        ))}

      {isPast && toConfirm.length > 0 && (
        <p className="text-center text-sm text-muted">
          Touche une séance pour dire si tu l'as faite.
        </p>
      )}
    </div>
  );
}

export default DayView;
