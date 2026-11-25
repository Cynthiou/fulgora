import { useEffect, useRef } from "react";
import Icon from "./Icon";

type Props = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  // "danger": the answer destroys something, the button turns red (CAL-07)
  tone?: "primary" | "danger";
  // The small picture of the tinted square on top
  icon?: string;
  // Disabled while the answer is being sent
  isSending?: boolean;
};

// A question with two answers (CAL-07, PRO-03e). A native <dialog> opened
// with showModal() keeps the focus inside and closes on Escape (which
// counts as cancel). The mockups draw a card of 14 px of radius with a
// tinted square, a slanted title of 28 px and the two answers underneath.
function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  tone = "primary",
  icon,
  isSending = false,
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
      className="m-auto flex w-[calc(100%-3rem)] max-w-md flex-col gap-3 rounded-hero bg-base-100 p-[22px] text-base-content shadow-dialog backdrop:bg-pick/45"
    >
      {icon !== undefined && (
        <span
          aria-hidden="true"
          className={`grid size-12 place-items-center rounded-hero ${
            tone === "danger"
              ? "bg-status-missed/10 text-status-missed-text"
              : "bg-secondary/10 text-secondary"
          }`}
        >
          <Icon src={icon} className="size-6" />
        </span>
      )}
      <h2 id="confirm-title" className="text-[28px] leading-none">
        {title}
      </h2>
      <p id="confirm-message" className="text-sm leading-[1.45] text-muted">
        {message}
      </p>
      <button
        type="button"
        onClick={onConfirm}
        disabled={isSending}
        className={`flex h-13 w-full items-center justify-center rounded-btn text-sm font-extrabold uppercase tracking-[0.02em] disabled:opacity-60 ${
          tone === "danger"
            ? "bg-status-missed text-white"
            : "bg-primary text-primary-content shadow-action"
        }`}
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSending}
        className="flex h-[50px] w-full items-center justify-center rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card disabled:opacity-60"
      >
        {cancelLabel}
      </button>
    </dialog>
  );
}

export default ConfirmDialog;
