import { useEffect, useRef } from "react";
import { Link } from "react-router";
import type { CurrentWorkoutSession } from "shared";

type Props = {
  current: CurrentWorkoutSession;
  onClose: () => void;
};

// One session at a time (RM-040): the start was refused, the way out is to
// go back to the session in progress or to close.
function AlreadyInProgressDialog({ current, onClose }: Props) {
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
      aria-labelledby="in-progress-title"
      aria-describedby="in-progress-message"
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-hero border border-base-300 bg-base-100 p-6 text-base-content shadow-card backdrop:bg-neutral/60"
    >
      <h2 id="in-progress-title" className="text-display-sm">
        Une séance est déjà en cours
      </h2>
      <p id="in-progress-message" className="mt-3 text-muted">
        Termine ou abandonne « {current.session_name} » avant d'en démarrer une
        autre.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Link
          to={`/entrainement/${current.id}`}
          className="flex h-btn items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action"
        >
          Reprendre « {current.session_name} »
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="h-12 rounded-btn border border-base-300 bg-base-100 font-semibold"
        >
          Fermer
        </button>
      </div>
    </dialog>
  );
}

export default AlreadyInProgressDialog;
