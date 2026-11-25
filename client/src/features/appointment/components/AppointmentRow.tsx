import { Link } from "react-router";
import {
  type DayEntry,
  describeEntry,
  formatShortDay,
  getAppointmentDisplayDate,
  getAppointmentStatus,
  getEntryTime,
} from "shared";
import StatusChip from "../../../components/StatusChip";

type Props = {
  entry: DayEntry;
  // The next session of the day: the mockups ring it in blue (CAL-01)
  isNext?: boolean;
  // CAL-03e: a session of another day shows that day ("SAM 28") in place of
  // its hour, and the hour moves under the name.
  withDate?: boolean;
};

// Screens CAL-01, CAL-02 and CAL-03: one session of a day. The time on the
// left, the name and what it is in the middle, its status on the right. A
// reminder (a session done another day) is greyed and has no time, but it
// opens the same session (RM-070).
function AppointmentRow({ entry, isNext = false, withDate = false }: Props) {
  const { item, isReminder } = entry;
  const status = getAppointmentStatus(item);
  const time = getEntryTime(entry);
  const lead = withDate
    ? formatShortDay(getAppointmentDisplayDate(item))
    : time;
  const subtitle = [withDate ? time : null, describeEntry(entry)]
    .filter((part): part is string => part !== null)
    .join(" · ");

  return (
    <li>
      <Link
        to={`/seances/${item.id}`}
        className={`flex items-center gap-3 rounded-card border bg-base-100 px-3 py-2.5 ${
          isNext
            ? "border-[1.5px] border-secondary shadow-next"
            : "border-base-300 shadow-card"
        } ${isReminder ? "opacity-60" : ""}`}
      >
        <span className="w-[42px] shrink-0 text-[13px] font-extrabold">
          {lead ?? <span aria-hidden="true">—</span>}
          {lead === null && <span className="sr-only">Sans heure</span>}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <b className="truncate text-sm font-bold">{item.session_name}</b>
          <span className="truncate text-[11.5px] font-medium leading-[1.45] text-muted">
            {subtitle}
          </span>
        </span>
        <StatusChip status={status} />
      </Link>
    </li>
  );
}

export default AppointmentRow;
