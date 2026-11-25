import { STATUSES, type StatusCode } from "shared";

// The small square of the calendar: the shape says the status, the colour
// only helps (RM-064). It is never alone, the legend names every square.
const DOT_CLASSES: Record<StatusCode, string> = {
  planned: "border-2 border-secondary",
  completed: "border-2 border-status-done bg-status-done",
  unfinished:
    "border-2 border-status-pending bg-gradient-to-r from-status-pending from-50% to-transparent to-50%",
  to_confirm: "border-2 border-dashed border-status-pending",
  missed: "border-0",
  cancelled: "border-0",
  moved: "border-0",
};

// The two statuses drawn as a character instead of a square.
const DOT_SYMBOLS: Partial<Record<StatusCode, string>> = {
  missed: "×",
  cancelled: "/",
  moved: "↷",
};

type Props = {
  status: StatusCode;
  // Named for the screen reader when the square stands alone in a cell
  isLabelled?: boolean;
};

function StatusDot({ status, isLabelled = false }: Props) {
  const symbol = DOT_SYMBOLS[status];

  return (
    <span className="inline-flex size-3 items-center justify-center">
      <span
        aria-hidden="true"
        className={
          symbol === undefined
            ? `size-3 rounded-[2px] ${DOT_CLASSES[status]}`
            : "text-xs font-bold leading-none"
        }
      >
        {symbol}
      </span>
      {isLabelled && <span className="sr-only">{STATUSES[status].label}</span>}
    </span>
  );
}

export default StatusDot;
