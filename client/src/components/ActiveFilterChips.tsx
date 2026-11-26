import xIcon from "../assets/icons/ui/app/x.svg";
import Icon from "./Icon";

export type ActiveFilter = {
  key: string;
  label: string;
  onRemove: () => void;
};

type Props = {
  filters: ActiveFilter[];
  onClearAll: () => void;
};

// Screens 04 and SUI-05g: the active filters as chips. "×" removes one,
// "Tout effacer" removes them all (US-08, US-52).
function ActiveFilterChips({ filters, onClearAll }: Props) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ul aria-label="Filtres actifs" className="flex flex-wrap gap-1.5">
        {filters.map((filter) => (
          <li key={filter.key}>
            <button
              type="button"
              onClick={filter.onRemove}
              aria-label={`Retirer le filtre ${filter.label}`}
              className="flex h-[30px] items-center gap-1.5 rounded-full bg-secondary/10 px-2.5 text-xs font-bold text-secondary"
            >
              {filter.label}
              <Icon src={xIcon} className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClearAll}
        className="min-h-tap px-1 text-[13px] font-semibold text-secondary"
      >
        Tout effacer
      </button>
    </div>
  );
}

export default ActiveFilterChips;
