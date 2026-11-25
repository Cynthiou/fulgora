import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import chevronRightIcon from "../../../assets/icons/ui/chevrons/chevron-right.svg";
import Icon from "../../../components/Icon";

type Props = {
  appointmentId: number;
  // False once the session has been started, done or cancelled: its
  // preparation does not change anymore (RM-058).
  canEdit: boolean;
  // False once it was started, done or already cancelled (RM-035)
  canCancel: boolean;
  // False once it was done or cancelled (RM-068)
  canMove: boolean;
  onMove: () => void;
  onCancel: () => void;
  onClose: () => void;
};

const ROW =
  "flex w-full items-center gap-3 border-b border-base-300 px-4 py-3 text-left";

// Screen CAL-04m: the "⋯" of a planned session. "Modifier la séance" opens
// the editor (US-17); "Déplacer" (US-25) and "Annuler le rendez-vous"
// (US-26) are shown as the wireframe does, not working yet.
function SessionActionsSheet({
  appointmentId,
  canEdit,
  canCancel,
  canMove,
  onMove,
  onCancel,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();

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
      aria-label="Actions de la séance"
      onClose={onClose}
      className="mt-auto mb-0 w-full max-w-md rounded-t-hero border border-base-300 bg-base-100 p-0 pb-4 text-base-content shadow-card backdrop:bg-neutral/60"
    >
      <div className="flex justify-center py-3">
        <span
          aria-hidden="true"
          className="h-1 w-10 rounded-full bg-base-300"
        />
      </div>

      <button
        type="button"
        disabled={!canEdit}
        onClick={() => navigate(`/seances/${appointmentId}/modifier`)}
        className={`${ROW} disabled:opacity-60`}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-display text-display-sm">
            Modifier la séance
          </span>
          <span className="text-sm text-muted">
            {canEdit
              ? "Blocs, exercices, séries"
              : "Cette séance a déjà été commencée ou annulée"}
          </span>
        </span>
        <Icon src={chevronRightIcon} className="size-5 shrink-0 text-muted" />
      </button>

      <button
        type="button"
        disabled={!canMove}
        onClick={onMove}
        className={`${ROW} disabled:opacity-60`}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-display text-display-sm">Déplacer</span>
          <span className="text-sm text-muted">
            {canMove
              ? "Autre date ou heure"
              : "Cette séance a été faite ou annulée"}
          </span>
        </span>
        <Icon src={chevronRightIcon} className="size-5 shrink-0 text-muted" />
      </button>

      <button
        type="button"
        disabled={!canCancel}
        onClick={onCancel}
        className={`${ROW} disabled:opacity-60`}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-display text-display-sm">
            Annuler le rendez-vous
          </span>
          <span className="text-sm text-muted">
            {canCancel
              ? "La séance reste visible, annulée"
              : "Cette séance a été commencée ou est déjà annulée"}
          </span>
        </span>
      </button>

      <div className="p-4">
        <button
          type="button"
          onClick={onClose}
          className="flex h-btn w-full items-center justify-center rounded-btn border border-base-300 bg-base-100 font-semibold"
        >
          Fermer
        </button>
      </div>
    </dialog>
  );
}

export default SessionActionsSheet;
