import searchIcon from "../../../assets/icons/ui/app/search.svg";
import xIcon from "../../../assets/icons/ui/app/x.svg";
import v3SearchIcon from "../../../assets/icons/ui/v3/search.svg";
import Icon from "../../../components/Icon";

type Props = {
  value: string;
  onChange: (value: string) => void;
  // "×": clears the field at once, without waiting for the typing delay.
  onClear: () => void;
  // "form": the 42 px field of the catalog in selection (handoff 2.3)
  variant?: "page" | "form";
};

// Screen 04: the search field. "×" clears it.
function ExerciseSearch({ value, onChange, onClear, variant = "page" }: Props) {
  const isForm = variant === "form";

  return (
    <div className="relative">
      <label htmlFor="exercise-search" className="sr-only">
        Rechercher un exercice
      </label>
      <span
        className={`pointer-events-none absolute inset-y-0 flex items-center text-muted ${
          isForm ? "left-3" : "left-3.5"
        }`}
      >
        <Icon
          src={isForm ? v3SearchIcon : searchIcon}
          className={isForm ? "size-4" : "size-[18px]"}
        />
      </span>
      <input
        id="exercise-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Rechercher un exercice"
        autoComplete="off"
        maxLength={60}
        className={`w-full border border-base-300 bg-base-100 placeholder:text-faint ${
          isForm
            ? "h-[46px] rounded-[12px] pr-10 pl-[38px] text-[15px] font-medium focus:border-accent focus:outline-none"
            : "h-[50px] rounded-btn pr-12 pl-[42px] text-[15px] shadow-card"
        }`}
      />
      {value !== "" && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Effacer le champ de recherche"
          className={`absolute inset-y-0 flex items-center justify-center text-muted ${
            isForm ? "right-0 w-10" : "right-1 size-tap"
          }`}
        >
          <Icon src={xIcon} className={isForm ? "size-4" : "size-[18px]"} />
        </button>
      )}
    </div>
  );
}

export default ExerciseSearch;
