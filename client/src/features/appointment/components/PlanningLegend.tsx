import { STATUS_CODES, STATUSES } from "shared";
import StatusDot from "./StatusDot";

// The legend under the month grid (CAL-01): every square of the calendar is
// named in words, so the shape and the colour are never the only clue.
function PlanningLegend() {
  return (
    <ul
      aria-label="Légende des statuts"
      className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted"
    >
      {STATUS_CODES.map((status) => (
        <li key={status} className="flex items-center gap-1">
          <StatusDot status={status} />
          {STATUSES[status].label}
        </li>
      ))}
    </ul>
  );
}

export default PlanningLegend;
