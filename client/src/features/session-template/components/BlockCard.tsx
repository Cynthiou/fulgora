import { useState } from "react";
import {
  BLOCK_TYPE_LABELS,
  type DraftBlock,
  findTimedBlockProblem,
  formatBlockCardLine,
  formatExerciseSummary,
  getBlockLabel,
} from "shared";
import arrowDownIcon from "../../../assets/icons/ui/v3/arrow-down.svg";
import arrowUpIcon from "../../../assets/icons/ui/v3/arrow-up.svg";
import chevronDownSmallIcon from "../../../assets/icons/ui/v3/chevron-down-sm.svg";
import chevronRightSmallIcon from "../../../assets/icons/ui/v3/chevron-right-sm.svg";
import copyIcon from "../../../assets/icons/ui/v3/copy.svg";
import dotsIcon from "../../../assets/icons/ui/v3/dots.svg";
import pencilIcon from "../../../assets/icons/ui/v3/pencil.svg";
import trashIcon from "../../../assets/icons/ui/v3/trash.svg";
import xIcon from "../../../assets/icons/ui/v3/x.svg";
import Icon from "../../../components/Icon";
import { useCloseOnOutside } from "../../../hooks/useCloseOnOutside";
import { BLOCK_TYPE_ICONS } from "./blockTypeIcons";

const MENU_ITEM =
  "flex h-10 w-full items-center gap-2.5 rounded-[8px] px-2.5 text-left text-[13px] font-semibold hover:bg-back-strong";

type Props = {
  block: DraftBlock;
  index: number;
  // Opens the block on its own screen (3.2)
  onEdit: () => void;
  // Inserts a copy right after this block
  onDuplicate: () => void;
  // "Monter" and "Descendre", only when the move is possible (US-16)
  onMoveUp: (() => void) | null;
  onMoveDown: (() => void) | null;
  onRemove: () => void;
  onRemoveExercise: (exerciseKey: string) => void;
};

// Screen 3.1: one block of the session. Its header tells the type, the
// place of the block and how many exercises it holds, and folds the card.
// The "⋯" menu holds everything else: open the block, duplicate it, move
// it, remove it. Removing asks nothing: the page offers an undo for 5 s.
function BlockCard({
  block,
  index,
  onEdit,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onRemove,
  onRemoveExercise,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuBox = useCloseOnOutside<HTMLDivElement>(isMenuOpen, () =>
    setIsMenuOpen(false),
  );
  const label = getBlockLabel(block, index);
  // A timed block that is not ready says so, in red (US-43)
  const problem = findTimedBlockProblem(block);

  function run(action: () => void) {
    setIsMenuOpen(false);
    action();
  }

  return (
    <div className="relative mb-2.5 rounded-[14px] border border-base-300 bg-base-100 shadow-card">
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-tint text-secondary"
          >
            <Icon
              src={BLOCK_TYPE_ICONS[block.block_type]}
              className="size-[18px]"
            />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            {/* The whole sentence goes in the hidden text and the visible
                text is hidden from the reader: cut in pieces, the name
                came out glued ("ClassiqueBloc 1 · 4 exercices"). */}
            <span
              aria-hidden="true"
              className="truncate text-sm font-extrabold"
            >
              {BLOCK_TYPE_LABELS[block.block_type]}
            </span>
            <span className="sr-only">
              {[label, formatBlockCardLine(block, index), problem]
                .filter((part) => part !== null)
                .join(", ")}
            </span>
            <span
              aria-hidden="true"
              className={`mt-0.5 flex items-center gap-1 text-[11px] font-semibold ${
                problem === null ? "text-card-sub" : "text-status-missed-text"
              }`}
            >
              {problem ?? formatBlockCardLine(block, index)}
              <Icon
                src={isExpanded ? chevronDownSmallIcon : chevronRightSmallIcon}
                className="size-[13px]"
              />
            </span>
          </span>
        </button>

        {/* The menu sits in its own box: a tap inside it must not fold the
            card, and a tap outside closes it (RM-064). */}
        <div ref={menuBox} className="shrink-0">
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={`Actions du bloc ${label}`}
            aria-expanded={isMenuOpen}
            className="grid size-8 place-items-center rounded-full text-muted"
          >
            <Icon src={dotsIcon} className="size-[18px]" />
          </button>
          {isMenuOpen && (
            <div className="absolute top-[50px] right-2.5 z-10 w-[190px] rounded-[12px] border border-base-300 bg-menu p-1 shadow-menu">
              <button
                type="button"
                onClick={() => run(onEdit)}
                className={MENU_ITEM}
              >
                <Icon src={pencilIcon} className="size-[15px] text-muted" />
                Modifier le bloc
              </button>
              <button
                type="button"
                onClick={() => run(onDuplicate)}
                className={MENU_ITEM}
              >
                <Icon src={copyIcon} className="size-[15px] text-muted" />
                Dupliquer
              </button>
              {onMoveUp !== null && (
                <button
                  type="button"
                  onClick={() => run(onMoveUp)}
                  className={MENU_ITEM}
                >
                  <Icon src={arrowUpIcon} className="size-[15px] text-muted" />
                  Monter
                </button>
              )}
              {onMoveDown !== null && (
                <button
                  type="button"
                  onClick={() => run(onMoveDown)}
                  className={MENU_ITEM}
                >
                  <Icon
                    src={arrowDownIcon}
                    className="size-[15px] text-muted"
                  />
                  Descendre
                </button>
              )}
              <div
                aria-hidden="true"
                className="mx-1.5 my-1 h-px bg-base-300"
              />
              <button
                type="button"
                onClick={() => run(onRemove)}
                className={`${MENU_ITEM} font-bold text-status-missed-text hover:bg-danger-soft`}
              >
                <Icon src={trashIcon} className="size-[15px]" />
                Supprimer
              </button>
            </div>
          )}
        </div>
      </div>

      {isExpanded && block.block_type === "note" && (
        <>
          <p className="border-t border-base-300 px-3 py-[7px] text-[13px] font-medium text-card-sub">
            {block.instructions?.trim() === undefined ||
            block.instructions.trim() === ""
              ? "Note vide"
              : block.instructions}
          </p>
          <div className="h-1" />
        </>
      )}

      {isExpanded && block.block_type !== "note" && (
        <>
          <ul aria-label={`Exercices du bloc ${index + 1}`} className="px-3">
            {block.exercises.map((exercise, position) => (
              <li
                key={exercise.key}
                className="flex items-center gap-2.5 border-t border-base-300 py-[7px]"
              >
                <span
                  aria-hidden="true"
                  className="w-[14px] shrink-0 text-[11px] font-extrabold tabular-nums text-muted"
                >
                  {position + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[13px] font-bold">{exercise.name}</span>
                  <span className="mt-0.5 text-[11px] font-semibold tabular-nums text-card-sub">
                    {formatExerciseSummary(
                      exercise.sets,
                      exercise.measure_codes,
                      exercise.is_bodyweight,
                      exercise.is_per_side,
                    )}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveExercise(exercise.key)}
                  aria-label={`Retirer ${exercise.name}`}
                  className="grid size-7 shrink-0 place-items-center rounded-full text-faint"
                >
                  <Icon src={xIcon} className="size-[15px]" />
                </button>
              </li>
            ))}
          </ul>
          <div className="h-1" />
        </>
      )}
    </div>
  );
}

export default BlockCard;
