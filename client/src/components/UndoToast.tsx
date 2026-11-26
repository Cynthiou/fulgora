import { useEffect, useRef } from "react";

type Props = {
  message: string;
  onUndo: () => void;
  // Called when the time is up (the action becomes final).
  onDismiss: () => void;
  durationMs?: number;
};

// "Bloc supprimé · Annuler": a short-lived message with a way back, just
// above the orange button (handoff 3.1). Announced to screen readers
// (role="status"); gone after 5 seconds by default.
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
      className="fixed inset-x-[18px] bottom-[82px] z-20 mx-auto flex h-[46px] max-w-md items-center justify-between rounded-[12px] bg-toast pr-2 pl-3.5 text-toast-content shadow-toast"
    >
      <span className="text-[13px] font-semibold">{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="h-[34px] rounded-[8px] px-3 text-[13px] font-extrabold text-toast-action"
      >
        Annuler
      </button>
    </div>
  );
}

export default UndoToast;
