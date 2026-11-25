import { useEffect, useRef } from "react";
import { Link } from "react-router";
import type { CurrentWorkoutSession } from "shared";
import playIcon from "../../../assets/icons/ui/app/play.svg";
import Icon from "../../../components/Icon";

type Props = {
  current: CurrentWorkoutSession;
  onClose: () => void;
};

// One session at a time (RM-040): the start was refused, the way out is to
// go back to the session in progress or to close. Same shape as the other
// dialogs of the mockups (CAL-07).
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
      className="m-auto flex w-[calc(100%-3rem)] max-w-md flex-col gap-3 rounded-hero bg-base-100 p-[22px] text-base-content shadow-dialog backdrop:bg-pick/45"
    >
      <span
        aria-hidden="true"
        className="grid size-12 place-items-center rounded-hero bg-primary/10 text-action-text"
      >
        <Icon src={playIcon} className="size-6" />
      </span>
      <h2 id="in-progress-title" className="text-[28px] leading-none">
        Une séance est déjà en cours
      </h2>
      <p id="in-progress-message" className="text-sm leading-[1.45] text-muted">
        Termine ou abandonne « {current.session_name} » avant d'en démarrer une
        autre.
      </p>
      <Link
        to={`/entrainement/${current.id}`}
        className="flex h-13 items-center justify-center gap-2.5 rounded-btn bg-primary text-sm font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action"
      >
        Reprendre « {current.session_name} »
      </Link>
      <button
        type="button"
        onClick={onClose}
        className="flex h-[50px] items-center justify-center rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card"
      >
        Fermer
      </button>
    </dialog>
  );
}

export default AlreadyInProgressDialog;
