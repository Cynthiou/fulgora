import chevronDownIcon from "../../../assets/icons/ui/app/chevron-down.svg";
import chevronUpIcon from "../../../assets/icons/ui/app/chevron-up.svg";
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
      className={`flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-ctl border px-2.5 text-[13px] font-semibold shadow-card ${
        isOpen || count > 0
          ? "border-pick bg-pick text-pick-content"
          : "border-base-300 bg-base-100"
      }`}
    >
      {label}
      {count > 0 && (
        <span className="flex size-[18px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-content">
          {count}
        </span>
      )}
      <Icon
        src={isOpen ? chevronUpIcon : chevronDownIcon}
        className="size-3.5"
      />
    </button>
  );
}

export default FilterToggle;
