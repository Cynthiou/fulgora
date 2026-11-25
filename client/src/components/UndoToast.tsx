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
      className="fixed inset-x-[18px] bottom-28 z-20 mx-auto flex max-w-md items-center justify-between gap-2.5 rounded-card bg-pick px-4 py-3.5 text-pick-content shadow-hero"
    >
      <span className="text-sm font-semibold">{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="min-h-tap px-2 text-sm font-extrabold uppercase tracking-[0.02em] text-primary"
      >
        Annuler
      </button>
    </div>
  );
}

export default UndoToast;
