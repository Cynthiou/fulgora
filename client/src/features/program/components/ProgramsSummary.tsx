// "Mes programmes" on the home page. Programs arrive in V1 (US-48): in the
// MVP the section explains what a program is and its button waits.
function ProgramsSummary() {
  return (
    <section aria-labelledby="programs-title" className="flex flex-col gap-3">
      <h2 id="programs-title" className="text-display-sm">
        Mes programmes
      </h2>
      <div className="flex flex-col gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card">
        <p className="text-muted">
          Aucun programme en cours. Un programme planifie tes séances sur
          plusieurs semaines.
        </p>
        <button
          type="button"
          disabled
          aria-describedby="programs-soon"
          className="h-12 rounded-btn border border-base-300 bg-base-100 font-semibold disabled:opacity-60"
        >
          Créer un programme
        </button>
        <p id="programs-soon" className="text-center text-sm text-muted">
          Les programmes arrivent bientôt.
        </p>
      </div>
    </section>
  );
}

export default ProgramsSummary;
