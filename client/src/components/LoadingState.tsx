type Props = {
  // Announced to screen readers; "Chargement…" by default.
  label?: string;
};

// role="status" makes screen readers read the text when it appears.
function LoadingState({ label = "Chargement…" }: Props) {
  return (
    <p role="status" className="py-6 text-center text-muted">
      {label}
    </p>
  );
}

export default LoadingState;
