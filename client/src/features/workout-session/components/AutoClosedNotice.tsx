// A session closed by the server after 4 hours without activity (RM-065).
// "Voir le résumé" comes with US-34, "Corriger les résultats" with US-37.
function AutoClosedNotice() {
  return (
    <p
      role="status"
      className="rounded-card border border-status-pending bg-base-100 p-4 font-semibold"
    >
      Cette séance a été clôturée après 4 heures sans activité. Tes résultats
      ont été conservés.
    </p>
  );
}

export default AutoClosedNotice;
