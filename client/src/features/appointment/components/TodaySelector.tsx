import { type AppointmentListItem, formatTodayCount } from "shared";

type Props = {
  items: AppointmentListItem[];
  selectedId: number;
  onSelect: (id: number) => void;
};

// "4 aujourd'hui": picks which session of the day the card shows.
// A native <select>: works with the keyboard and screen readers as is.
function TodaySelector({ items, selectedId, onSelect }: Props) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="font-semibold">{formatTodayCount(items.length)}</span>
      <select
        aria-label="Séance du jour à afficher"
        value={selectedId}
        onChange={(event) => onSelect(Number(event.target.value))}
        className="h-12 min-w-0 flex-1 rounded-btn border border-base-300 bg-base-100 px-3 font-semibold"
      >
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.planned_time ?? "Sans heure"} · {item.session_name}
          </option>
        ))}
      </select>
    </label>
  );
}

export default TodaySelector;
