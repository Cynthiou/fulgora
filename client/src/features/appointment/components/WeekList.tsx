import {
  type AppointmentListItem,
  addDays,
  buildDayEntries,
  formatLongDate,
  WEEKDAY_SHORT,
} from "shared";
import WeekRow from "./WeekRow";

type Props = {
  // The Monday of the week
  weekStart: string;
  today: string;
  items: AppointmentListItem[];
  onPickDay: (day: string) => void;
};

// Screen CAL-02: the seven days one under the other, each with its sessions.
// A day without any session keeps its line, drawn as a dashed rule. Today is
// written in blue.
function WeekList({ weekStart, today, items, onPickDay }: Props) {
  const days = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );

  return (
    <ul className="flex flex-col gap-2.5">
      {days.map((day, index) => {
        const entries = buildDayEntries(items, day);
        const isToday = day === today;
        return (
          <li key={day} className="flex gap-2.5">
            {/* Named by what it shows, with the full date hidden before:
                an aria-label alone would drop the visible text (axe). */}
            <button
              type="button"
              onClick={() => onPickDay(day)}
              className={`flex w-[38px] shrink-0 flex-col items-center pt-1.5 ${
                isToday ? "text-secondary" : ""
              }`}
            >
              <span className="sr-only">
                Voir le {formatLongDate(day).toLocaleLowerCase("fr-FR")}
              </span>
              <span
                aria-hidden="true"
                className={`text-[9.5px] font-bold uppercase tracking-[0.14em] ${
                  isToday ? "" : "text-muted"
                }`}
              >
                {WEEKDAY_SHORT[index]}
              </span>
              <span aria-hidden="true" className="text-[17px] font-extrabold">
                {Number(day.slice(8, 10))}
              </span>
            </button>

            {entries.length === 0 ? (
              <span className="mt-[27px] h-px flex-1 border-b border-dashed border-rule" />
            ) : (
              <ul className="flex flex-1 flex-col gap-[5px]">
                {entries.map((entry) => (
                  <WeekRow
                    key={`${entry.item.id}-${entry.isReminder}`}
                    entry={entry}
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
