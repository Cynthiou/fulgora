import { STATUSES, type StatusCode } from "shared";

// The color goes on the symbol only: the text stays dark, because the green
// and amber of the brand are too pale for text (brand guidelines, RM-064).
const SYMBOL_CLASSES: Record<StatusCode, string> = {
  planned: "text-secondary",
  completed: "text-status-done",
  unfinished: "text-status-pending",
  to_confirm: "text-status-pending",
  missed: "text-status-missed",
  cancelled: "text-status-cancelled",
  moved: "text-muted",
};

type Props = {
  status: StatusCode;
};

// Always a symbol and a word, never the color alone.
function StatusBadge({ status }: Props) {
  const { label, symbol } = STATUSES[status];

  return (
    <span className="inline-flex items-center gap-1 rounded-chip bg-soft px-2 py-0.5 text-xs font-semibold text-base-content">
      <span
        aria-hidden="true"
        className={`font-bold ${SYMBOL_CLASSES[status]}`}
      >
        {symbol}
      </span>
      {label}
    </span>
  );
}

export default StatusBadge;
