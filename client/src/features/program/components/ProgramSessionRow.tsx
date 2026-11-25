import { Link } from "react-router";
import {
  type AppointmentListItem,
  formatDayBadge,
  formatLongDate,
  getAppointmentStatus,
} from "shared";
import chevronRightIcon from "../../../assets/icons/ui/app/chevron-right.svg";
import Icon from "../../../components/Icon";
import StatusChip from "../../../components/StatusChip";

type Props = {
  item: AppointmentListItem;
  // The past sessions show their status instead of a chevron (PRO-13)
  withStatus?: boolean;
};

// Screens PRO-07 and PRO-13: one session of the program, with its day in a
// badge on the left. The whole line opens the session.
function ProgramSessionRow({ item, withStatus = false }: Props) {
  const badge = formatDayBadge(item.planned_date);

  return (
    <li>
      <Link
        to={`/seances/${item.id}`}
        className="flex items-center gap-3 rounded-card border border-base-300 bg-base-100 px-3 py-2.5 shadow-card"
      >
        {/* The badge is decorative: the date is read in full instead. */}
        <span className="sr-only">{formatLongDate(item.planned_date)} · </span>
        <span
          aria-hidden="true"
          className="flex w-10 shrink-0 flex-col items-center"
        >
          <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted">
            {badge.weekday}
          </span>
          <span className="text-base font-extrabold">{badge.day}</span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-bold">
            {item.session_name}
          </span>
          <span className="truncate text-[11.5px] font-medium leading-[1.45] text-muted">
            {item.planned_time ?? "sans heure"}
          </span>
        </span>
        {withStatus ? (
          <StatusChip status={getAppointmentStatus(item)} />
        ) : (
          <Icon src={chevronRightIcon} className="size-4 shrink-0 text-faint" />
        )}
      </Link>
    </li>
  );
}

export default ProgramSessionRow;
