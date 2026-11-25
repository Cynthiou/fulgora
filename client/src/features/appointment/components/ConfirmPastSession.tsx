import { formatConfirmDeadline } from "shared";
import arrowRightIcon from "../../../assets/icons/ui/app/arrow-right.svg";
import checkIcon from "../../../assets/icons/ui/app/check.svg";
import xIcon from "../../../assets/icons/ui/app/x.svg";
import Icon from "../../../components/Icon";

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
// The status, the name and the date are already written by the page above:
// here come the question and the three answers. "Je l'ai faite" writes the
// results after the fact (US-38), so it waits; "Pas faite" marks it missed
// right away, and it can still be declared done later (RM-054, RM-067).
function ConfirmPastSession({
  plannedDate,
  isSending,
  error,
  onNotDone,
  onMove,
}: Props) {
  return (
    <section
      aria-labelledby="confirm-title"
      className="flex flex-col gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
    >
      <h2 id="confirm-title" className="text-[26px] leading-none">
        Tu as fait cette séance ?
      </h2>
      <p className="text-sm leading-[1.45] text-muted">
        Tu pourras toujours la déclarer faite plus tard. Sans réponse, elle
        passera « Manquée » le {formatConfirmDeadline(plannedDate)}.
      </p>

      {error !== null && (
        <p role="alert" className="text-sm font-semibold">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onNotDone}
          disabled={isSending}
          className="flex h-13 items-center justify-center gap-2 rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card disabled:opacity-60"
        >
          <Icon src={xIcon} className="size-4" />
          {isSending ? "Enregistrement…" : "Pas faite"}
        </button>
        <button
          type="button"
          onClick={onMove}
          disabled={isSending}
          className="flex h-13 items-center justify-center gap-2 rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card disabled:opacity-60"
        >
          <Icon src={arrowRightIcon} className="size-4" />
          Déplacer
        </button>
      </div>

      {/* Writing the results after the fact is US-38. */}
      <button
        type="button"
        disabled
        aria-describedby="declare-later"
        className="flex h-btn items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60"
      >
        <Icon src={checkIcon} className="size-[18px]" />
        Je l'ai faite
      </button>
      <p id="declare-later" className="text-center text-xs text-muted">
        Saisir les résultats après coup arrive bientôt.
      </p>
    </section>
  );
}

export default ConfirmPastSession;
