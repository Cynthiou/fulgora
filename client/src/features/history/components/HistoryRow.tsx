import { Link } from "react-router";
import {
  describeHistoryDates,
  formatDayBadge,
  formatLongDate,
  getHistoryStatus,
  type HistoryItem,
} from "shared";
import StatusChip from "../../../components/StatusChip";

type Props = {
  item: HistoryItem;
};

// Screen SUI-05: one past session. The day badge, the name, then
// "Séance libre · ↷ déplacée du 21", with the status chip on the right.
// The whole line opens the detail.
function HistoryRow({ item }: Props) {
  const status = getHistoryStatus(item);
  const badge = formatDayBadge(item.history_date);
  const notes = describeHistoryDates(item);
  const source = item.program_name ?? "Séance libre";
  const subtitle = [source, ...notes].join(" · ");

  return (
    <li>
      <Link
        to={`/suivi/historique/${item.appointment_id}`}
        className="flex items-center gap-3 rounded-card border border-base-300 bg-base-100 px-3 py-2.5 shadow-card"
      >
        {/* The badge is decorative: the date is read in full instead. */}
        <span className="sr-only">{formatLongDate(item.history_date)} · </span>
        <span
          aria-hidden="true"
          className="flex size-[42px] shrink-0 flex-col items-center justify-center rounded-btn bg-soft"
        >
          <span className="text-[9px] font-bold uppercase text-muted">
            {badge.weekday}
          </span>
          <span className="text-base font-extrabold leading-none">
            {badge.day}
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-bold">
            {item.session_name}
          </span>
          <span className="truncate text-[11px] font-medium leading-[1.45] text-muted">
            {subtitle}
          </span>
        </span>
        <StatusChip status={status} />
      </Link>
    </li>
  );
}

export default HistoryRow;
