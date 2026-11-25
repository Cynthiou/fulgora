import { useNavigate } from "react-router";
import arrowRightIcon from "../../../assets/icons/ui/app/arrow-right.svg";
import pencilIcon from "../../../assets/icons/ui/app/pencil.svg";
import xIcon from "../../../assets/icons/ui/app/x.svg";
import BottomSheet from "../../../components/BottomSheet";
import SheetRow from "../../../components/SheetRow";

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

// Screen CAL-04m: the "⋯" of a planned session. "Modifier la séance" opens
// the editor (US-17), "Déplacer" moves it (US-25) and "Annuler le
// rendez-vous" gives it up (US-26).
function SessionActionsSheet({
  appointmentId,
  canEdit,
  canCancel,
  canMove,
  onMove,
  onCancel,
  onClose,
}: Props) {
  const navigate = useNavigate();

  return (
    <BottomSheet label="Actions de la séance" onClose={onClose}>
      <div className="overflow-hidden rounded-card border border-base-300 bg-base-100 shadow-card">
        <SheetRow
          isFirst
          icon={pencilIcon}
          title="Modifier la séance"
          subtitle={
            canEdit
              ? "Blocs, exercices, séries"
              : "Cette séance a déjà été commencée ou annulée"
          }
          disabled={!canEdit}
          onClick={() => navigate(`/seances/${appointmentId}/modifier`)}
        />
        <SheetRow
          icon={arrowRightIcon}
          title="Déplacer"
          subtitle={
            canMove
              ? "Autre date ou heure"
              : "Cette séance a été faite ou annulée"
          }
          disabled={!canMove}
          onClick={onMove}
        />
        <SheetRow
          isDanger
          icon={xIcon}
          title="Annuler le rendez-vous"
          subtitle={
            canCancel
              ? "La séance reste visible, annulée"
              : "Cette séance a été commencée ou est déjà annulée"
          }
          disabled={!canCancel}
          onClick={onCancel}
        />
      </div>
    </BottomSheet>
  );
}

export default SessionActionsSheet;
