import searchIcon from "../../../assets/icons/ui/app/search.svg";
import xIcon from "../../../assets/icons/ui/app/x.svg";
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
      <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted">
        <Icon src={searchIcon} className="size-[18px]" />
      </span>
      <input
        id="exercise-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Rechercher un exercice"
        autoComplete="off"
        maxLength={60}
        className="h-[50px] w-full rounded-btn border border-base-300 bg-base-100 pr-12 pl-[42px] text-[15px] shadow-card placeholder:text-faint"
      />
      {value !== "" && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Effacer le champ de recherche"
          className="absolute inset-y-0 right-1 flex size-tap items-center justify-center text-muted"
        >
          <Icon src={xIcon} className="size-[18px]" />
        </button>
      )}
    </div>
  );
}

export default ExerciseSearch;
