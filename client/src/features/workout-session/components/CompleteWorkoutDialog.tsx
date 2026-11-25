import ConfirmDialog from "../../../components/ConfirmDialog";

type Props = {
  // Sets without a validation yet (RM-046)
  missingCount: number;
  onConfirm: () => void;
  onCancel: () => void;
};

// "Terminer la séance ?": says how many sets stay undone, which keep no
// validation date in the history.
function CompleteWorkoutDialog({ missingCount, onConfirm, onCancel }: Props) {
  const message =
    missingCount === 0
      ? "Toutes les séries sont faites. Ton résumé t'attend."
      : missingCount === 1
        ? "1 série n'est pas faite. Elle restera non faite dans ton historique."
        : `${missingCount} séries ne sont pas faites. Elles resteront non faites dans ton historique.`;

  return (
    <ConfirmDialog
      title="Terminer la séance ?"
      message={message}
      confirmLabel="Terminer"
      cancelLabel="Continuer ma séance"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

export default CompleteWorkoutDialog;
