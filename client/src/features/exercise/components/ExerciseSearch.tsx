import xIcon from "../../../assets/icons/ui/actions/x.svg";
import searchIcon from "../../../assets/icons/ui/fields/search.svg";
import Icon from "../../../components/Icon";

type Props = {
  value: string;
  onChange: (value: string) => void;
  // "×": clears the field at once, without waiting for the typing delay.
  onClear: () => void;
};

// Screen 04: the search field. "×" clears it.
function ExerciseSearch({ value, onChange, onClear }: Props) {
  return (
    <div className="relative">
      <label htmlFor="exercise-search" className="sr-only">
        Rechercher un exercice
      </label>
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted">
        <Icon src={searchIcon} className="size-5" />
      </span>
      <input
        id="exercise-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Rechercher un exercice"
        autoComplete="off"
        maxLength={60}
        className="h-field w-full rounded-btn border border-base-300 bg-base-100 pr-12 pl-12"
      />
      {value !== "" && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Effacer le champ de recherche"
          className="absolute inset-y-0 right-1 flex size-tap items-center justify-center text-muted"
        >
          <Icon src={xIcon} className="size-5" />
        </button>
      )}
    </div>
  );
}

export default ExerciseSearch;
