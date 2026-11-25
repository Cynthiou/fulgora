import { formatConfirmDeadline, formatLongDate } from "shared";
import StatusBadge from "../../../components/StatusBadge";

type Props = {
  sessionName: string;
  plannedDate: string;
  plannedTime: string | null;
  programName: string | null;
  isSending: boolean;
  error: string | null;
  onNotDone: () => void;
  onMove: () => void;
};

// Screen CAL-08: a session whose day is past and which was never started.
// "Je l'ai faite" writes the results after the fact (US-38), so it waits;
// "Pas faite" marks it missed right away, and it can still be declared done
// later (RM-054, RM-067).
function ConfirmPastSession({
  sessionName,
  plannedDate,
  plannedTime,
  programName,
  isSending,
  error,
  onNotDone,
  onMove,
}: Props) {
  return (
    <section
      aria-labelledby="confirm-title"
      className="flex flex-col gap-3 rounded-card border border-dashed border-base-300 p-4"
    >
      <StatusBadge status="to_confirm" />
      <h2 id="confirm-title" className="text-display-md">
        {sessionName}
      </h2>
      <p className="text-muted">
        Prévue {formatLongDate(plannedDate).toLocaleLowerCase("fr-FR")}
        {plannedTime === null ? "" : ` · ${plannedTime}`} ·{" "}
        {programName ?? "séance libre"}
      </p>
      <p className="font-semibold">Tu as fait cette séance ?</p>

      {error !== null && (
        <p role="alert" className="font-semibold">
          {error}
        </p>
      )}

      {/* Writing the results after the fact is US-38. */}
      <button
        type="button"
        disabled
        aria-describedby="declare-later"
        className="flex h-btn items-center justify-center rounded-btn bg-neutral font-extrabold uppercase tracking-wide text-neutral-content disabled:opacity-60"
      >
        Je l'ai faite
      </button>
      <p id="declare-later" className="text-center text-sm text-muted">
        Saisir les résultats après coup arrive bientôt.
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onNotDone}
          disabled={isSending}
          className="flex h-btn flex-1 items-center justify-center rounded-btn border border-base-300 bg-base-100 font-semibold disabled:opacity-60"
        >
          {isSending ? "Enregistrement…" : "Pas faite"}
        </button>
        <button
          type="button"
          onClick={onMove}
          disabled={isSending}
          className="flex h-btn flex-1 items-center justify-center rounded-btn border border-base-300 bg-base-100 font-semibold disabled:opacity-60"
        >
          Déplacer
        </button>
      </div>

      <p className="text-sm text-muted">
        Tu pourras toujours la déclarer faite plus tard.
      </p>
      <p className="text-sm text-muted">
        Sans réponse, elle passera « Manquée » le{" "}
        {formatConfirmDeadline(plannedDate)}.
      </p>
    </section>
  );
}

export default ConfirmPastSession;
