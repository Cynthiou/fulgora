type Props = {
  title?: string;
  // Optional second line, for example "Vérifie ta connexion internet, puis réessaie."
  message?: string;
  // When given, a "Réessayer" button calls it.
  onRetry?: () => void;
};

// role="alert" makes screen readers read the error right away.
function ErrorState({
  title = "Une erreur est survenue.",
  message,
  onRetry,
}: Props) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 py-6 text-center"
    >
      <p className="font-semibold">{title}</p>
      {message !== undefined && <p className="text-muted">{message}</p>}
      {onRetry !== undefined && (
        <button
          type="button"
          onClick={onRetry}
          className="h-12 rounded-btn border border-base-300 bg-base-100 px-5 font-semibold"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}

export default ErrorState;
