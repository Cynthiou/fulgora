import ConfirmDialog from "../../../components/ConfirmDialog";

type Props = {
  onConfirm: () => void;
  onCancel: () => void;
};

// "Abandonner cette séance ?": the validated sets stay, the session cannot
// be resumed (RM-045). Escape and "Continuer ma séance" change nothing.
function AbandonWorkoutDialog({ onConfirm, onCancel }: Props) {
  return (
    <ConfirmDialog
      title="Abandonner cette séance ?"
      message="Tes séries faites seront gardées dans ton historique. Tu ne pourras pas reprendre cette séance."
      confirmLabel="Abandonner"
      cancelLabel="Continuer ma séance"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

export default AbandonWorkoutDialog;
