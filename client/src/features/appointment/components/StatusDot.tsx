import { STATUSES, type StatusCode } from "shared";

// The colour of each status in the calendar and in the chips (CAL-01).
const DOT_COLOURS: Record<StatusCode, string> = {
  planned: "bg-secondary",
  completed: "bg-status-done",
  unfinished: "bg-status-pending",
  to_confirm: "bg-status-pending",
  missed: "bg-status-missed",
  cancelled: "bg-status-cancelled",
  moved: "bg-muted",
};

type Props = {
  status: StatusCode;
  // 5 px in a day of the month, 7 px in the legend
  size?: "sm" | "md";
  // Named for the screen reader when the dot stands alone in a cell
  isLabelled?: boolean;
};

// Screen CAL-01: a small round dot says what a day holds. It never stands
// alone: the legend names every colour, and each session says its status in
// words right under the calendar (RM-064).
function StatusDot({ status, size = "sm", isLabelled = false }: Props) {
  return (
    <span className="inline-flex items-center justify-center">
      <span
        aria-hidden="true"
        className={`block rounded-full ${
          size === "sm" ? "size-[5px]" : "size-[7px]"
        } ${DOT_COLOURS[status]}`}
      />
      {isLabelled && <span className="sr-only">{STATUSES[status].label}</span>}
    </span>
  );
}

export default StatusDot;
