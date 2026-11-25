import clockIcon from "../../../assets/icons/ui/app/clock.svg";
import Icon from "../../../components/Icon";

// A session closed by the server after 4 hours without activity (RM-065).
// "Voir le résumé" comes with US-34, "Corriger les résultats" with US-37.
function AutoClosedNotice() {
  return (
    <p
      role="status"
      className="flex items-start gap-2.5 rounded-card border border-base-300 bg-status-pending/[0.08] p-3.5 text-[13px] leading-[1.45] font-medium"
    >
      <Icon
        src={clockIcon}
        className="mt-px size-[18px] shrink-0 text-status-pending-text"
      />
      Cette séance a été clôturée après 4 heures sans activité. Tes résultats
      ont été conservés.
    </p>
  );
}

export default AutoClosedNotice;
