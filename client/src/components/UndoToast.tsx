import { useEffect, useRef } from "react";

type Props = {
  message: string;
  onUndo: () => void;
  // Called when the time is up (the action becomes final).
  onDismiss: () => void;
  durationMs?: number;
};

// "Bloc retiré · Annuler": a short-lived message with a way back. Announced
// to screen readers (role="status"); gone after 5 seconds by default.
function UndoToast({ message, onUndo, onDismiss, durationMs = 5000 }: Props) {
  // The latest callbacks, without restarting the timer on every render.
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;

  useEffect(() => {
    const timer = setTimeout(() => dismiss.current(), durationMs);
    return () => clearTimeout(timer);
  }, [durationMs]);

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-28 z-20 mx-auto flex max-w-md items-center justify-between gap-3 rounded-card bg-neutral p-3 text-neutral-content shadow-card"
    >
      <span className="font-semibold">{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="min-h-tap px-3 font-extrabold uppercase tracking-wide text-primary"
      >
        Annuler
      </button>
    </div>
  );
}

export default UndoToast;
