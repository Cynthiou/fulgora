import { useEffect, useRef } from "react";
import { formatLongDate } from "shared";

type Props = {
  sessionName: string;
  plannedDate: string;
  plannedTime: string | null;
  isSending: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

// Screen CAL-07: the confirmation before giving up a session. The session
// stays visible as cancelled, it is never removed (RM-035).
function CancelAppointmentDialog({
  sessionName,
  plannedDate,
  plannedTime,
  isSending,
  error,
  onConfirm,
  onClose,
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

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="cancel-title"
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-hero border-2 border-neutral bg-base-100 p-5 text-base-content shadow-card backdrop:bg-neutral/60"
    >
      <h2 id="cancel-title" className="text-display-sm">
        Annuler « {sessionName} » ?
      </h2>
      <p className="mt-2 text-muted">
        {formatLongDate(plannedDate)}
        {plannedTime === null ? "" : ` · ${plannedTime}`}. La séance restera
        visible dans ton historique comme annulée.
      </p>

      {error !== null && (
        <p role="alert" className="mt-3 font-semibold">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSending}
          className="flex h-btn items-center justify-center rounded-btn bg-neutral font-extrabold uppercase tracking-wide text-neutral-content disabled:opacity-60"
        >
          {isSending ? "Annulation…" : "Annuler la séance"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={isSending}
          className="flex h-btn items-center justify-center rounded-btn border border-base-300 bg-base-100 font-semibold disabled:opacity-60"
        >
          Garder la séance
        </button>
      </div>
    </dialog>
  );
}

export default CancelAppointmentDialog;
