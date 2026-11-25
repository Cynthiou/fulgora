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
      className="flex flex-col gap-2.5 rounded-card border border-base-300 bg-base-100 p-3 shadow-card"
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
                className={`flex h-[62px] w-full flex-col items-center justify-center gap-1 rounded-btn p-2 text-center text-[11px] font-semibold ${
                  isActive
                    ? "border-[1.5px] border-secondary bg-secondary/[0.08] text-secondary"
                    : "bg-soft"
                }`}
              >
                {option.icon !== undefined && (
                  <img
                    src={option.icon}
                    alt=""
                    width={24}
                    height={24}
                    className="size-6"
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
          className="h-11 rounded-btn border border-base-300 text-sm font-bold"
        >
          {clearLabel}
        </button>
      )}
    </fieldset>
  );
}

export default FilterGrid;
