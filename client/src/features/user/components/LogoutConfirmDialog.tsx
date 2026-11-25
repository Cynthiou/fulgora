import { useEffect, useRef } from "react";
import { type CurrentWorkoutSession, formatTimeOfDay } from "shared";

type Props = {
  session: CurrentWorkoutSession;
  isLoggingOut: boolean;
  onConfirm: () => void;
  onStay: () => void;
};

// PRF-09: asked only when a session is in progress. A native <dialog> opened
// with showModal() keeps the focus inside and closes on Escape by itself.
function LogoutConfirmDialog({
  session,
  isLoggingOut,
  onConfirm,
  onStay,
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
      // Very old browsers (and some test environments): shown, not modal.
      dialog.setAttribute("open", "");
    }
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="logout-title"
      aria-describedby="logout-message"
      // Escape closes the dialog: that counts as "stay connected".
      onClose={onStay}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-hero border border-base-300 bg-base-100 p-6 text-base-content shadow-card backdrop:bg-neutral/60"
    >
      <h2 id="logout-title" className="text-display-sm">
        Une séance est en cours
      </h2>
      <p id="logout-message" className="mt-3 text-muted">
        {session.session_name} · commencée à{" "}
        {formatTimeOfDay(session.started_at)}. Si tu te déconnectes, elle
        restera en cours et tu pourras la reprendre à ta prochaine connexion.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoggingOut}
          className="h-btn rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action disabled:opacity-60"
        >
          Se déconnecter
        </button>
        <button
          type="button"
          onClick={onStay}
          disabled={isLoggingOut}
          className="h-12 rounded-btn border border-base-300 bg-base-100 font-semibold"
        >
          Rester connecté
        </button>
      </div>
    </dialog>
  );
}

export default LogoutConfirmDialog;
