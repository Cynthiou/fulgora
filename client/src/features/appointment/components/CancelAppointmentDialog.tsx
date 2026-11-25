import { formatLongDate } from "shared";
import xIcon from "../../../assets/icons/ui/app/x.svg";
import ConfirmDialog from "../../../components/ConfirmDialog";

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
  const when = `${formatLongDate(plannedDate)}${
    plannedTime === null ? "" : ` · ${plannedTime}`
  }`;

  return (
    <ConfirmDialog
      tone="danger"
      icon={xIcon}
      isSending={isSending}
      title={`Annuler « ${sessionName} » ?`}
      message={
        error === null
          ? `${when}. La séance restera visible dans ton historique comme annulée.`
          : error
      }
      confirmLabel={isSending ? "Annulation…" : "Annuler la séance"}
      cancelLabel="Garder la séance"
      onConfirm={onConfirm}
      onCancel={onClose}
    />
  );
}

export default CancelAppointmentDialog;
