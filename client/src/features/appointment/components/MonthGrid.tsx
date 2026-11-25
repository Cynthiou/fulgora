import { type KeyboardEvent, useEffect, useRef } from "react";
import {
  type AppointmentListItem,
  addDays,
  buildMonthCell,
  formatLongDate,
  formatMonthTitle,
  listMonthWeeks,
  WEEKDAY_INITIALS,
  WEEKDAY_NAMES,
} from "shared";
import StatusDot from "./StatusDot";

type Props = {
  // "2026-11"
  yearMonth: string;
  selectedDay: string;
  today: string;
  items: AppointmentListItem[];
  onSelect: (day: string) => void;
};

// Screen CAL-01: the month, Monday first, written as a table, because a
// calendar is a table of days. Three indicators per day at most, "+n"
// beyond. The arrows move from day to day, and only the selected day is
// reachable with the tab key.
function MonthGrid({ yearMonth, selectedDay, today, items, onSelect }: Props) {
  const tableRef = useRef<HTMLTableElement>(null);
  // Focus follows the selection only after a key press, never on arrival.
  const movedWithKeyboard = useRef(false);

  useEffect(() => {
    if (!movedWithKeyboard.current) {
      return;
    }
    movedWithKeyboard.current = false;
    tableRef.current
      ?.querySelector<HTMLButtonElement>(`button[data-day="${selectedDay}"]`)
      ?.focus();
  }, [selectedDay]);

  function handleKeyDown(event: KeyboardEvent<HTMLTableElement>) {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const step = moves[event.key];
    if (step === undefined) {
      return;
    }
    event.preventDefault();
    movedWithKeyboard.current = true;
    onSelect(addDays(selectedDay, step));
  }

  return (
    <table
      ref={tableRef}
      onKeyDown={handleKeyDown}
      className="w-full table-fixed border-separate border-spacing-y-1"
    >
      <caption className="sr-only">
        Calendrier de {formatMonthTitle(yearMonth)}
      </caption>
      <thead>
        <tr>
          {WEEKDAY_NAMES.map((name, index) => (
            <th
              key={name}
              scope="col"
              className="py-1 text-center text-xs font-semibold text-muted"
            >
              <span aria-hidden="true">{WEEKDAY_INITIALS[index]}</span>
              <span className="sr-only">{name}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {listMonthWeeks(yearMonth).map((week) => (
          <tr key={week[0]?.key}>
            {week.map((slot) =>
              slot.day === null ? (
                // Empty box before the first day and after the last one
                <td key={slot.key} className="h-12" />
              ) : (
                <td key={slot.key} className="p-0">
                  <DayCell
                    day={slot.day}
                    isSelected={slot.day === selectedDay}
                    isToday={slot.day === today}
                    items={items}
                    onSelect={onSelect}
                  />
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type CellProps = {
  day: string;
  isSelected: boolean;
  isToday: boolean;
  items: AppointmentListItem[];
  onSelect: (day: string) => void;
};

function DayCell({ day, isSelected, isToday, items, onSelect }: CellProps) {
  const cell = buildMonthCell(items, day);
  const total = cell.indicators.length + cell.extra;

  return (
    <button
      type="button"
      data-day={day}
      tabIndex={isSelected ? 0 : -1}
      aria-pressed={isSelected}
      aria-current={isToday ? "date" : undefined}
      onClick={() => onSelect(day)}
      className={`flex h-12 w-full flex-col items-center justify-center gap-0.5 rounded-ctl text-base-content ${
        isSelected ? "border-2 border-neutral font-extrabold" : ""
      } ${isToday && !isSelected ? "font-extrabold" : ""}`}
    >
      <span className={isSelected ? "font-display" : ""}>
        {Number(day.slice(8, 10))}
      </span>
      <span className="flex h-3 items-center gap-0.5">
        {cell.indicators.map((indicator) => (
          <StatusDot key={indicator.appointment_id} status={indicator.status} />
        ))}
        {cell.extra > 0 && (
          <span aria-hidden="true" className="text-[10px] font-semibold">
            +{cell.extra}
          </span>
        )}
        {cell.hasMoved && (
          <span aria-hidden="true" className="text-[10px]">
            ↷
          </span>
        )}
      </span>
      <span className="sr-only">
        {formatLongDate(day)}
        {total === 0
          ? ", aucune séance"
          : `, ${total} séance${total > 1 ? "s" : ""}`}
      </span>
    </button>
  );
}

export default MonthGrid;
