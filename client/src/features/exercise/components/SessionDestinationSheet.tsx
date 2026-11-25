import { useEffect, useRef } from "react";
import { formatExerciseCountShort, type SelectedExercise } from "shared";

type Props = {
  exercises: SelectedExercise[];
  onContinue: () => void;
  onCancel: () => void;
};

// Screen 04 state 5b: where do the chosen exercises go? In the MVP the only
// destination is a new free session (adding to a coming session is US-17), so
// that choice is already made; "Continuer vers l'éditeur" confirms it.
function SessionDestinationSheet({ exercises, onContinue, onCancel }: Props) {
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
      aria-labelledby="destination-title"
      onClose={onCancel}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-hero border border-base-300 bg-base-100 p-6 text-base-content shadow-card backdrop:bg-neutral/60"
    >
      <h2 id="destination-title" className="text-display-sm">
        Ajouter {formatExerciseCountShort(exercises.length)}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {exercises.map((exercise) => exercise.name).join(", ")}
      </p>

      <fieldset className="mt-5 flex flex-col gap-2">
        <legend className="text-overline uppercase text-accent">
          Destination
        </legend>
        <button
          type="button"
          aria-pressed="true"
          className="flex flex-col rounded-card border-2 border-primary bg-base-100 p-4 text-left"
        >
          <span className="font-semibold">Nouvelle séance libre</span>
          <span className="text-sm text-muted">
            Tu choisiras la date ensuite
          </span>
        </button>
      </fieldset>

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={onContinue}
          className="h-btn rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action"
        >
          Continuer vers l'éditeur
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-12 rounded-btn border border-base-300 bg-base-100 font-semibold"
        >
          Annuler
        </button>
      </div>
    </dialog>
  );
}

export default SessionDestinationSheet;
