// "Mes programmes" on the home page. Programs arrive in V1 (US-48): in the
// MVP the section only explains what a program is.
function ProgramsSummary() {
  return (
    <section aria-labelledby="programs-title" className="flex flex-col gap-3">
      <h2
        id="programs-title"
        className="font-sans text-overline not-italic uppercase text-accent"
      >
        Mes programmes
      </h2>
      <p className="rounded-card border border-base-300 bg-base-100 p-4 text-muted shadow-card">
        Aucun programme en cours. Un programme planifie tes séances sur
        plusieurs semaines.
      </p>
    </section>
  );
}

export default ProgramsSummary;
