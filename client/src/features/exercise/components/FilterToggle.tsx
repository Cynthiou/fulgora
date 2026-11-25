import chevronDownIcon from "../../../assets/icons/ui/chevrons/chevron-down.svg";
import chevronUpIcon from "../../../assets/icons/ui/chevrons/chevron-up.svg";
import Icon from "../../../components/Icon";

type Props = {
  label: string;
  // Number of active choices, shown on the button.
  count: number;
  isOpen: boolean;
  // The id of the grid this button opens.
  controls: string;
  onToggle: () => void;
};

// Screen 04: "Groupe ▼" with the number of active choices.
function FilterToggle({ label, count, isOpen, controls, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls={controls}
      className={`flex min-h-tap flex-1 items-center justify-center gap-1 rounded-btn border px-2 text-sm font-semibold ${
        isOpen || count > 0
          ? "border-secondary bg-base-100 text-secondary"
          : "border-base-300 bg-base-100"
      }`}
    >
      {label}
      {count > 0 && (
        <span className="flex size-5 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-content">
          {count}
        </span>
      )}
      <Icon src={isOpen ? chevronUpIcon : chevronDownIcon} className="size-4" />
    </button>
  );
}

export default FilterToggle;
