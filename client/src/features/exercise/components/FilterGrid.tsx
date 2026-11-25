export type FilterOption = {
  id: string;
  name: string;
  icon?: string;
};

type Props = {
  id: string;
  label: string;
  options: FilterOption[];
  activeIds: string[];
  columns: 3 | 4;
  clearLabel: string;
  onToggle: (id: string) => void;
  onClear: () => void;
};

// Screen 04, state 4: a grid of tiles under the search. An active tile has a
// thick border, a check mark and a bold label: never the color alone.
// Plain buttons with aria-pressed: Tab, Enter and Space work as is.
function FilterGrid({
  id,
  label,
  options,
  activeIds,
  columns,
  clearLabel,
  onToggle,
  onClear,
}: Props) {
  return (
    <fieldset
      id={id}
      className="flex flex-col gap-3 rounded-card border border-base-300 bg-base-100 p-3 shadow-card"
    >
      <legend className="sr-only">{label}</legend>
      <ul
        className={
          columns === 4 ? "grid grid-cols-4 gap-2" : "grid grid-cols-3 gap-2"
        }
      >
        {options.map((option) => {
          const isActive = activeIds.includes(option.id);
          return (
            <li key={option.id}>
              <button
                type="button"
                aria-pressed={isActive}
                onClick={() => onToggle(option.id)}
                className={`flex min-h-tap w-full flex-col items-center justify-center gap-1 rounded-ctl p-2 text-center text-xs ${
                  isActive
                    ? "border-2 border-secondary font-bold"
                    : "border border-base-300 font-semibold"
                }`}
              >
                {option.icon !== undefined && (
                  <img
                    src={option.icon}
                    alt=""
                    width={40}
                    height={40}
                    className="size-10"
                  />
                )}
                <span>
                  {isActive && <span aria-hidden="true">✓ </span>}
                  {option.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {activeIds.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="h-12 rounded-btn border border-base-300 font-semibold"
        >
          {clearLabel}
        </button>
      )}
    </fieldset>
  );
}

export default FilterGrid;
