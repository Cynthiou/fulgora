import { Link } from "react-router";
import {
  type DayEntry,
  describeEntry,
  getAppointmentStatus,
  getEntryTime,
  STATUSES,
} from "shared";
import chevronRightIcon from "../../../assets/icons/ui/chevrons/chevron-right.svg";
import Icon from "../../../components/Icon";
import StatusDot from "./StatusDot";

type Props = {
  entry: DayEntry;
  // The next session of the day, the only one with a "À suivre" flag (CAL-03)
  isNext?: boolean;
  // The time in front of the name, as in the day view (CAL-03)
  showTime?: boolean;
};

// One line of the Planning: the time, the status, the name, what the session
// is. A reminder (a session done another day) is greyed and has no time, but
// it opens the same session (RM-070).
function AppointmentRow({ entry, isNext = false, showTime = true }: Props) {
  const { item, isReminder } = entry;
  const status = getAppointmentStatus(item);
  const time = getEntryTime(entry);

  return (
    <li className="border-b border-base-300 last:border-b-0">
      <Link
        to={`/seances/${item.id}`}
        className={`flex items-center gap-3 p-3 ${isReminder ? "bg-soft" : ""}`}
      >
        {showTime && (
          <span
            className={`w-12 shrink-0 font-semibold ${
              isReminder ? "text-faint" : ""
            }`}
          >
            {time ?? <span aria-hidden="true">—</span>}
            {time === null && <span className="sr-only">Sans heure</span>}
          </span>
        )}
        <StatusDot status={status} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={`truncate font-display text-display-sm ${
              isReminder ? "text-muted" : ""
            }`}
          >
            {item.session_name}
          </span>
          <span className="truncate text-sm text-muted">
            <span className="sr-only">{STATUSES[status].label} · </span>
            {describeEntry(entry)}
          </span>
          {isNext && (
            <span className="mt-1 w-fit rounded-chip bg-neutral px-2 py-0.5 text-overline uppercase text-neutral-content">
              À suivre
            </span>
          )}
        </span>
        {!showTime && (
          <span
            className={`shrink-0 font-semibold ${isReminder ? "text-faint" : ""}`}
          >
            {time ?? <span aria-hidden="true">—</span>}
            {time === null && <span className="sr-only">Sans heure</span>}
          </span>
        )}
        <Icon src={chevronRightIcon} className="size-5 shrink-0 text-muted" />
      </Link>
    </li>
  );
}

export default AppointmentRow;
