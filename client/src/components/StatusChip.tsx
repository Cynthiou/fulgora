import { STATUSES, type StatusCode } from "shared";

// Each status has its own tint, as the high fidelity mockups draw it
// (CAL-01, CAL-04, SUI-05): a light background and the word in the same
// colour. The word is always there, so the colour is never the only clue.
const CHIP: Record<StatusCode, string> = {
  planned: "bg-secondary/10 text-secondary",
  completed: "bg-status-done/10 text-status-done-text",
  unfinished: "bg-status-pending/10 text-status-pending-text",
  to_confirm: "bg-status-pending/10 text-status-pending-text",
  missed: "bg-status-missed/10 text-status-missed-text",
  cancelled: "bg-status-cancelled/10 text-status-cancelled-text",
  moved: "bg-neutral/[0.06] text-muted",
};

// The symbol the mockups put in front of the word, when there is one.
const SYMBOL: Partial<Record<StatusCode, string>> = {
  completed: "✓",
  missed: "×",
  moved: "↷",
};

type Props = {
  status: StatusCode;
};

function StatusChip({ status }: Props) {
  const symbol = SYMBOL[status];

  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-chip px-2 py-[3px] text-[11px] font-bold ${CHIP[status]}`}
    >
      {symbol === undefined ? "" : `${symbol} `}
      {STATUSES[status].label}
    </span>
  );
}

export default StatusChip;
