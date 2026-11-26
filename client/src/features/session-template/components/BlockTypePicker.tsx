import { type BlockType, CREATABLE_BLOCK_TYPES } from "shared";
import chevronRightIcon from "../../../assets/icons/ui/v3/chevron-right.svg";
import BottomSheet from "../../../components/BottomSheet";
import { SHEET_TITLE } from "../../../components/formClasses";
import Icon from "../../../components/Icon";
import { BLOCK_TYPE_ICONS } from "./blockTypeIcons";

type Props = {
  onPick: (blockType: BlockType) => void;
  onClose: () => void;
};

// Screen 2.1: the panel that slides from the bottom with the 7 types of
// block, each one with its Lucide icon in a tinted square and what it does
// on one line. The Note is not offered anymore (RM-020). Touching a line
// creates the block and opens it (screen 2.2).
function BlockTypePicker({ onPick, onClose }: Props) {
  return (
    <BottomSheet
      variant="form"
      label="Type de bloc"
      onClose={onClose}
      closeLabel={null}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2 px-1">
        <h2 className={SHEET_TITLE}>Type de bloc</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-[13px] font-bold text-muted"
        >
          Fermer
        </button>
      </div>
      <ul className="flex flex-col gap-1.5">
        {CREATABLE_BLOCK_TYPES.map((info) => (
          <li key={info.code}>
            <button
              type="button"
              onClick={() => onPick(info.code)}
              className="flex w-full items-center gap-2.5 rounded-[12px] border border-base-300 bg-base-100 px-2 py-[7px] text-left"
            >
              <span
                aria-hidden="true"
                className="grid size-[34px] shrink-0 place-items-center rounded-[9px] bg-tint text-secondary"
              >
                <Icon
                  src={BLOCK_TYPE_ICONS[info.code]}
                  className="size-[17px]"
                />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <b className="text-sm font-bold">{info.label}</b>
                <span className="mt-px truncate text-[10.5px] font-medium text-card-sub">
                  {info.description}
                </span>
              </span>
              <Icon
                src={chevronRightIcon}
                className="size-4 shrink-0 text-muted"
              />
            </button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}

export default BlockTypePicker;
