import { Link } from "react-router";

// Unknown address (US-44).
function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-md flex-col gap-6 p-4">
      <h1 className="text-display-md">Page introuvable</h1>
      <p className="text-muted">Cette adresse ne mène à rien dans Fulgora.</p>
      <Link
        to="/"
        className="flex h-btn items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action"
      >
        Retour à l'accueil
      </Link>
    </section>
  );
}

export default NotFoundPage;
