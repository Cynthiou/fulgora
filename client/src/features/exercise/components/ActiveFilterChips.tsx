import xIcon from "../../../assets/icons/ui/actions/x.svg";
import Icon from "../../../components/Icon";

export type ActiveFilter = {
  key: string;
  label: string;
  onRemove: () => void;
};

type Props = {
  filters: ActiveFilter[];
  onClearAll: () => void;
};

// Screen 04: the active filters as chips under the search. "×" removes one,
// "Tout effacer" removes them all.
function ActiveFilterChips({ filters, onClearAll }: Props) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ul aria-label="Filtres actifs" className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <li key={filter.key}>
            <button
              type="button"
              onClick={filter.onRemove}
              aria-label={`Retirer le filtre ${filter.label}`}
              className="flex min-h-tap items-center gap-1 rounded-chip border border-base-300 bg-base-100 px-3 text-sm font-semibold"
            >
              {filter.label}
              <Icon src={xIcon} className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClearAll}
        className="min-h-tap px-2 text-sm font-semibold text-secondary"
      >
        Tout effacer
      </button>
    </div>
  );
}

export default ActiveFilterChips;
