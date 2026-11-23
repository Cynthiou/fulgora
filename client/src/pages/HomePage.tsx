import logoDark from "../assets/logo/fulgora-logo-dark-bg.svg";

// Temporary page: it only checks that the brand (logo, fonts, colors) works.
function HomePage() {
  return (
    <section className="mx-auto flex max-w-md flex-col gap-6 p-4">
      <img src={logoDark} alt="Fulgora" className="h-12 w-auto self-start" />
      <h1 className="text-4xl">Ton carnet d'entraînement</h1>
      <p>Prépare tes séances, note ce que tu fais, suis tes progrès.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary">
          Démarrer la séance
        </button>
        <button type="button" className="btn btn-secondary">
          Voir le programme
        </button>
        <span className="badge badge-accent">Débutant</span>
      </div>
    </section>
  );
}

export default HomePage;
