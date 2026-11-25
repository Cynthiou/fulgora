import { BLOCK_TYPES, type BlockType } from "shared";
import chevronRightIcon from "../../../assets/icons/ui/app/chevron-right.svg";
import BottomSheet from "../../../components/BottomSheet";
import Icon from "../../../components/Icon";

type Props = {
  onPick: (blockType: BlockType) => void;
  onClose: () => void;
};

// Screen A3: the 8 block types in one column, each with its two letters in
// a square. The timed ones (Circuit, AMRAP, For Time) are greyed with
// "Bientôt" and cannot be chosen before US-43.
function BlockTypePicker({ onPick, onClose }: Props) {
  return (
    <BottomSheet label="Type de bloc" onClose={onClose} closeLabel={null}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[26px] leading-none">Type de bloc</h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-tap px-1 text-sm font-semibold text-secondary"
        >
          Fermer
        </button>
      </div>
      <ul className="overflow-hidden rounded-card border border-base-300">
        {BLOCK_TYPES.map((info, index) => (
          <li key={info.code}>
            <button
              type="button"
              disabled={!info.isAvailable}
              onClick={() => onPick(info.code)}
              className={`flex min-h-[54px] w-full items-center gap-3 px-3.5 py-2 text-left disabled:opacity-60 ${
                index === 0 ? "" : "border-t border-base-300"
              } ${info.isAvailable ? "bg-secondary/[0.06]" : ""}`}
            >
              <span
                aria-hidden="true"
                className={`grid size-[34px] shrink-0 place-items-center rounded-btn text-xs font-extrabold ${
                  info.isAvailable
                    ? "bg-secondary text-secondary-content"
                    : "bg-soft text-muted"
                }`}
              >
                {info.label.slice(0, 2).toUpperCase()}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <b className="truncate text-sm font-bold">
                  {info.label}
                  {!info.isAvailable && (
                    <>
                      {" "}
                      <span className="rounded-chip bg-soft px-1.5 py-0.5 text-overline uppercase text-muted">
                        Bientôt
                      </span>
                      <span className="sr-only">, indisponible</span>
                    </>
                  )}
                </b>
                <span className="text-xs leading-[1.45] text-muted">
                  {info.description}
                </span>
              </span>
              {info.isAvailable && (
                <Icon
                  src={chevronRightIcon}
                  className="size-[18px] shrink-0 text-faint"
                />
              )}
            </button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}

export default BlockTypePicker;
