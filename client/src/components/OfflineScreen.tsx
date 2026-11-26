import ErrorState from "./ErrorState";

// US-45: without a network, the app shows its own screen instead of the
// error page of the browser. Nothing of the account is kept offline: the
// app simply waits for the connection to come back.
function OfflineScreen() {
  return (
    <main className="flex min-h-screen flex-col justify-center bg-base-200 px-[18px]">
      {/* The title of the screen for the screen readers; the card below
          shows it in the style of the charter. */}
      <h1 className="sr-only">Pas de connexion</h1>
      <p className="pb-4 text-center font-display text-[26px] font-extrabold uppercase italic tracking-[0.1em]">
        Fulgora
      </p>
      <div className="mx-auto w-full max-w-md">
        <ErrorState
          title="Pas de connexion"
          message="Fulgora a besoin d'internet pour enregistrer tes séances."
          onRetry={() => window.location.reload()}
        />
      </div>
    </main>
  );
}

export default OfflineScreen;
