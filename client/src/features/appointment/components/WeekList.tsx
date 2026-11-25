import {
  type AppointmentListItem,
  addDays,
  buildDayEntries,
  formatLongDate,
} from "shared";
import AppointmentRow from "./AppointmentRow";

type Props = {
  // The Monday of the week
  weekStart: string;
  today: string;
  items: AppointmentListItem[];
  onPickDay: (day: string) => void;
};

const DAY_NAMES = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];

// Screen CAL-02: the seven days one under the other, each with its sessions.
// A day without any session keeps its line, empty.
function WeekList({ weekStart, today, items, onPickDay }: Props) {
  const days = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );

  return (
    <ul className="flex flex-col gap-3">
      {days.map((day, index) => {
        const entries = buildDayEntries(items, day);
        const isToday = day === today;
        return (
          <li key={day} className="flex gap-3">
            <button
              type="button"
              onClick={() => onPickDay(day)}
              aria-label={`Voir le ${formatLongDate(day).toLowerCase()}`}
              className="flex w-10 shrink-0 flex-col items-center"
            >
              <span className="text-overline uppercase text-muted">
                {DAY_NAMES[index]}
              </span>
              <span
                className={`flex size-8 items-center justify-center rounded-ctl font-display text-display-sm ${
                  isToday ? "bg-neutral text-neutral-content" : ""
                }`}
              >
                {Number(day.slice(8, 10))}
              </span>
            </button>

            {entries.length === 0 ? (
              <span className="mt-4 h-px flex-1 bg-base-300" />
            ) : (
              <ul className="flex-1 overflow-hidden rounded-card border border-base-300 bg-base-100 shadow-card">
                {entries.map((entry) => (
                  <AppointmentRow
                    key={`${entry.item.id}-${entry.isReminder}`}
                    entry={entry}
                    showTime={false}
                  />
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default WeekList;
