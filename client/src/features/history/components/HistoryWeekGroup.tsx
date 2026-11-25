import { formatWeekLabel, type HistoryWeek } from "shared";
import HistoryRow from "./HistoryRow";

type Props = {
  week: HistoryWeek;
};

// Screen SUI-05: the lines of one week under "SEMAINE DU 23 NOV.".
function HistoryWeekGroup({ week }: Props) {
  const id = `week-${week.monday}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2
        id={id}
        className="font-sans text-overline uppercase not-italic text-muted"
      >
        {formatWeekLabel(week.monday)}
      </h2>
      <ul className="flex flex-col gap-2">
        {week.items.map((item) => (
          <HistoryRow key={item.appointment_id} item={item} />
        ))}
      </ul>
    </section>
  );
}

export default HistoryWeekGroup;
