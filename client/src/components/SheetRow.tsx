import chevronRightIcon from "../assets/icons/ui/app/chevron-right.svg";
import Icon from "./Icon";

type Props = {
  // The small picture of the left square
  icon: string;
  title: string;
  subtitle?: string;
  // True for an action that destroys something (red, no chevron)
  isDanger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  // The first row of a card carries no line above it
  isFirst?: boolean;
};

// One row of a list of actions (CAL-04m, A3, PRF-01): a tinted square, the
// action and what it does, then a chevron. 56 px tall, inside a white card.
function SheetRow({
  icon,
  title,
  subtitle,
  isDanger = false,
  disabled = false,
  onClick,
  isFirst = false,
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-3.5 py-2 text-left disabled:opacity-60 ${
        isFirst ? "" : "border-t border-base-300"
      }`}
    >
      <span
        aria-hidden="true"
        className={`grid size-9 shrink-0 place-items-center rounded-btn ${
          isDanger
            ? "bg-status-missed/10 text-status-missed-text"
            : "bg-secondary/[0.08] text-secondary"
        }`}
      >
        <Icon src={icon} className="size-[18px]" />
      </span>
      <span className="flex min-h-10 min-w-0 flex-1 flex-col justify-center gap-0.5">
        <span
          className={`truncate text-[15px] font-semibold ${
            isDanger ? "text-status-missed-text" : ""
          }`}
        >
          {title}
        </span>
        {subtitle !== undefined && (
          <span className="truncate text-xs font-medium leading-[1.45] text-muted">
            {subtitle}
          </span>
        )}
      </span>
      {!isDanger && (
        <Icon
          src={chevronRightIcon}
          className="size-[18px] shrink-0 text-faint"
        />
      )}
    </button>
  );
}

export default SheetRow;
