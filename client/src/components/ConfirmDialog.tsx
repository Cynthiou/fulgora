import { useEffect, useRef } from "react";

type Props = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

// A question with two answers. A native <dialog> opened with showModal()
// keeps the focus inside and closes on Escape (which counts as cancel).
function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: Props) {
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
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      onClose={onCancel}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-hero border border-base-300 bg-base-100 p-6 text-base-content shadow-card backdrop:bg-neutral/60"
    >
      <h2 id="confirm-title" className="text-display-sm">
        {title}
      </h2>
      <p id="confirm-message" className="mt-3 text-muted">
        {message}
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={onConfirm}
          className="h-btn rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action"
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-12 rounded-btn border border-base-300 bg-base-100 font-semibold"
        >
          {cancelLabel}
        </button>
      </div>
    </dialog>
  );
}

export default ConfirmDialog;
