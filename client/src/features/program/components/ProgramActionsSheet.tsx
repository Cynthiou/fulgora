import type { ProgramActions } from "shared";
import copyIcon from "../../../assets/icons/ui/app/copy.svg";
import pencilIcon from "../../../assets/icons/ui/app/pencil.svg";
import stopIcon from "../../../assets/icons/ui/app/stop.svg";
import trashIcon from "../../../assets/icons/ui/app/trash.svg";
import BottomSheet from "../../../components/BottomSheet";
import SheetRow from "../../../components/SheetRow";

type Props = {
  actions: ProgramActions;
  // Opens PRO-08 (US-20); null while the program cannot be changed
  onEdit: (() => void) | null;
  // Opens PRO-11, or PRO-11b when a session of the program is in progress
  onStop: (() => void) | null;
  // True once a session of the program has been started: the menu then
  // offers "Abandonner" instead of "Supprimer" (US-21)
  hasStarted: boolean;
  onClose: () => void;
};

// Screen PRO-07b: the "⋯" of a program. Every action of the mockup is
// listed; the ones that are not built yet say when they arrive (US-19 to
// US-22), so the menu never hides what exists.
function ProgramActionsSheet({
  actions,
  onEdit,
  onStop,
  hasStarted,
  onClose,
}: Props) {
  // One of the two, never both (US-21): a program nobody started
  // disappears whole, one already lived is given up and kept.
  const stopTitle = hasStarted
    ? "Abandonner le programme"
    : "Supprimer le programme";
  const stopSubtitle = hasStarted
    ? actions.canAbandon
      ? "Les séances à venir seront annulées"
      : "Une séance est en cours"
    : actions.canDelete
      ? "Tout est retiré du Planning"
      : "Pas possible dans cet état";
  return (
    <BottomSheet label="Actions du programme" onClose={onClose}>
      <div className="overflow-hidden rounded-card border border-base-300 bg-base-100 shadow-card">
        <SheetRow
          isFirst
          icon={pencilIcon}
          title="Modifier le programme"
          subtitle={
            onEdit === null
              ? actions.canEdit
                ? "Les séances se modifient depuis le brouillon"
                : "Un programme fini ne change plus"
              : "Jours, heures et fin"
          }
          disabled={onEdit === null}
          onClick={onEdit ?? onClose}
        />
        <SheetRow
          icon={copyIcon}
          title="Réutiliser ce programme"
          subtitle={
            actions.canReuse
              ? "Repartir de ses séances · bientôt"
              : "Possible une fois le programme fini"
          }
          disabled
          onClick={onClose}
        />
        <SheetRow
          isDanger
          icon={hasStarted ? stopIcon : trashIcon}
          title={stopTitle}
          subtitle={stopSubtitle}
          disabled={onStop === null}
          onClick={onStop ?? onClose}
        />
      </div>
      <p className="px-1 text-xs text-muted">
        Réutiliser un programme arrive avec la prochaine carte.
      </p>
    </BottomSheet>
  );
}

export default ProgramActionsSheet;
