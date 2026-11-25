import { Link } from "react-router";
import {
  type DayEntry,
  describeEntry,
  getAppointmentStatus,
  getEntryTime,
  STATUSES,
  type StatusCode,
} from "shared";

// The week view has no chip: a 3 px bar on the left carries the colour of the
// status, and the word is written under the name (CAL-02).
const BAR: Record<StatusCode, string> = {
  planned: "border-l-secondary",
  completed: "border-l-status-done",
  unfinished: "border-l-status-pending",
  to_confirm: "border-l-status-pending",
  missed: "border-l-status-missed",
  cancelled: "border-l-status-cancelled",
  moved: "border-l-muted",
};

// A status that asks for something or that went wrong is written in words
// under the name; the others leave the room to the origin of the session.
const SPELLED: StatusCode[] = [
  "to_confirm",
  "unfinished",
  "missed",
  "cancelled",
];

type Props = {
  entry: DayEntry;
};

// Screen CAL-02: one session inside a day of the week, in a smaller shape
// than the day view. The hour sits on the right, and a session without hour
// shows a dash, as the mockup draws it.
function WeekRow({ entry }: Props) {
  const { item, isReminder } = entry;
  const status = getAppointmentStatus(item);
  const time = getEntryTime(entry);
  const subtitle = SPELLED.includes(status)
    ? STATUSES[status].label
    : describeEntry(entry);

  return (
    <li>
      <Link
        to={`/seances/${item.id}`}
        className={`flex items-center gap-2 rounded-btn border border-l-[3px] border-base-300 bg-base-100 px-2.5 py-[7px] shadow-card ${
          BAR[status]
        } ${isReminder ? "opacity-60" : ""}`}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <b className="truncate text-[13px] font-bold">{item.session_name}</b>
          <span className="truncate text-[10.5px] font-medium leading-[1.45] text-muted">
            {subtitle}
          </span>
          {/* The colour of the bar is never the only clue (RM-064). */}
          <span className="sr-only">{STATUSES[status].label}</span>
        </span>
        <span className="shrink-0 text-[11.5px] font-bold leading-[1.45] text-muted">
          {time ?? <span aria-hidden="true">—</span>}
          {time === null && <span className="sr-only">Sans heure</span>}
        </span>
      </Link>
    </li>
  );
}

export default WeekRow;
