import { type ReactNode, useEffect, useRef } from "react";

type Props = {
  // Read aloud when the sheet opens
  label: string;
  // Closing happens on Escape, on the backdrop and on "Fermer"
  onClose: () => void;
  // The label of the last button; null hides it (the sheet has its own)
  closeLabel?: string | null;
  // "form": the panel of the v3 forms (handoff des blocs 2.1): rounded by
  // 26, on the colour of the sheet, with a thin grabber and no padding of
  // its own around the content.
  variant?: "page" | "form";
  children: ReactNode;
};

// The panel that slides from the bottom of the screen (CAL-04m, A3, CAL-05).
// A native <dialog> opened with showModal() keeps the focus inside and
// closes on Escape. The grabber of the mockups sits on top, the sheet is
// rounded by 20 px and the content is given by the caller.
function BottomSheet({
  label,
  onClose,
  closeLabel = "Fermer",
  variant = "page",
  children,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null || dialog.open) {
      return;
    }
    const opener = document.activeElement;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus();
      }
    };
  }, []);

  const isForm = variant === "form";

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      onClose={onClose}
      className={`mt-auto mb-0 w-full max-w-md p-0 text-base-content ${
        isForm
          ? "rounded-t-[26px] border-t border-base-300 bg-sheet shadow-panel backdrop:bg-scrim"
          : "rounded-t-[20px] bg-base-100 shadow-sheet backdrop:bg-pick/45"
      }`}
    >
      <div
        className={
          isForm
            ? "flex flex-col px-3 pt-2 pb-3.5"
            : "flex flex-col gap-3 px-5 pt-2.5 pb-4"
        }
      >
        <span
          aria-hidden="true"
          className={
            isForm
              ? "mb-2.5 h-1 w-9 self-center rounded-[2px] bg-dash"
              : "h-1 w-10 self-center rounded-full bg-rule"
          }
        />
        {children}
        {closeLabel !== null && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-[50px] w-full items-center justify-center rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card"
          >
            {closeLabel}
          </button>
        )}
      </div>
    </dialog>
  );
}

export default BottomSheet;
