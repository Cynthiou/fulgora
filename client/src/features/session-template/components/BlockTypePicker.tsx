import { useEffect, useRef } from "react";
import { BLOCK_TYPES, type BlockType } from "shared";
import chevronRightIcon from "../../../assets/icons/ui/chevrons/chevron-right.svg";
import Icon from "../../../components/Icon";

type Props = {
  onPick: (blockType: BlockType) => void;
  onClose: () => void;
};

// Screen A3: the 8 block types in one column. The timed ones (Circuit, AMRAP,
// For Time) are greyed with "Bientôt" and cannot be chosen before US-43.
// A native <dialog>: focus kept inside, Escape closes.
function BlockTypePicker({ onPick, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null || dialog.open) {
      return;
    }
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="block-type-title"
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-hero border border-base-300 bg-base-100 p-4 text-base-content shadow-card backdrop:bg-neutral/60"
    >
      <div className="flex items-center justify-between">
        <h2 id="block-type-title" className="text-display-sm">
          Type de bloc
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-tap px-2 font-semibold text-secondary"
        >
          Fermer
        </button>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {BLOCK_TYPES.map((info) => (
          <li key={info.code}>
            <button
              type="button"
              disabled={!info.isAvailable}
              onClick={() => onPick(info.code)}
              className="flex min-h-tap w-full items-center gap-3 rounded-card border border-base-300 p-3 text-left disabled:opacity-60"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">
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
                </span>
                <span className="text-sm text-muted">{info.description}</span>
              </span>
              {info.isAvailable && (
                <Icon src={chevronRightIcon} className="size-5 text-muted" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </dialog>
  );
}

export default BlockTypePicker;
