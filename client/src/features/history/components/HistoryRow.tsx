import { Link } from "react-router";
import {
  describeHistoryDates,
  formatDayBadge,
  formatLongDate,
  getHistoryStatus,
  type HistoryItem,
} from "shared";
import chevronRightIcon from "../../../assets/icons/ui/chevrons/chevron-right.svg";
import Icon from "../../../components/Icon";
import StatusBadge from "../../../components/StatusBadge";

type Props = {
  item: HistoryItem;
};

// Screen SUI-05: one past session. The day badge, the name, then
// "Effectuée · Séance libre · Prévue le 19". The whole line opens the detail.
function HistoryRow({ item }: Props) {
  const status = getHistoryStatus(item);
  const badge = formatDayBadge(item.history_date);
  const notes = describeHistoryDates(item);
  const source = item.program_name ?? "Séance libre";

  return (
    <li>
      <Link
        to={`/suivi/historique/${item.appointment_id}`}
        className="flex items-center gap-3 rounded-card border border-base-300 bg-base-100 p-3 shadow-card"
      >
        {/* The badge is decorative: the date is read in full instead. */}
        <span className="sr-only">{formatLongDate(item.history_date)} · </span>
        <span
          aria-hidden="true"
          className="flex w-11 shrink-0 flex-col items-center rounded-ctl bg-soft py-1"
        >
          <span className="text-overline uppercase text-muted">
            {badge.weekday}
          </span>
          <span className="font-display text-display-sm leading-none">
            {badge.day}
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate font-semibold">{item.session_name}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <StatusBadge status={status} />
            <span>· {source}</span>
            {notes.map((note) => (
              <span key={note}>· {note}</span>
            ))}
          </span>
        </span>
        <Icon src={chevronRightIcon} className="size-5 shrink-0 text-muted" />
      </Link>
    </li>
  );
}

export default HistoryRow;
