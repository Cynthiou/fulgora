import { useState } from "react";
import {
  HISTORY_PERIOD_LABELS,
  HISTORY_PERIODS,
  HISTORY_STATUS_LABELS,
  HISTORY_STATUSES,
  type HistoryFilters,
  type HistoryStatusFilter,
} from "shared";
import BottomSheet from "../../../components/BottomSheet";
import type { ProgramListItem } from "../../program/services/programService";

type Props = {
  filters: HistoryFilters;
  programs: ProgramListItem[];
  // How many sessions the current list holds, for the button of the mockup
  count: number;
  onApply: (filters: HistoryFilters) => void;
  onClear: () => void;
  onClose: () => void;
};

const CHIP =
  "h-11 rounded-chip border px-3.5 text-[13px] font-bold transition-colors";
const CHIP_ON = "border-pick bg-pick text-pick-content";
const CHIP_OFF = "border-base-300 bg-base-100";

// Screen SUI-05f: the filters of the history, chosen then applied with
// "Afficher". Closing the sheet without applying changes nothing (US-52).
function HistoryFilterSheet({
  filters,
  programs,
  count,
  onApply,
  onClear,
  onClose,
}: Props) {
  const [draft, setDraft] = useState<HistoryFilters>(filters);

  function toggleStatus(status: HistoryStatusFilter) {
    setDraft((current) => ({
      ...current,
      statuses: current.statuses.includes(status)
        ? current.statuses.filter((one) => one !== status)
        : [...current.statuses, status],
    }));
  }

  function pickProgram(program: "free" | number) {
    setDraft((current) => ({
      ...current,
      program: current.program === program ? null : program,
    }));
  }

  return (
    <BottomSheet label="Filtrer l'historique" onClose={onClose}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-display-xs">Filtrer</h2>
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-bold text-secondary"
        >
          Effacer
        </button>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-sans text-overline uppercase not-italic text-accent">
          Période
        </legend>
        <div className="flex flex-wrap gap-2">
          {HISTORY_PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              aria-pressed={draft.period === period}
              onClick={() => setDraft({ ...draft, period })}
              className={`${CHIP} ${
                draft.period === period ? CHIP_ON : CHIP_OFF
              }`}
            >
              {HISTORY_PERIOD_LABELS[period]}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          Puis ‹ › sur la liste pour changer de période.
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-sans text-overline uppercase not-italic text-accent">
          Statut
        </legend>
        <div className="flex flex-wrap gap-2">
          {HISTORY_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={draft.statuses.includes(status)}
              onClick={() => toggleStatus(status)}
              className={`${CHIP} ${
                draft.statuses.includes(status) ? CHIP_ON : CHIP_OFF
              }`}
            >
              {HISTORY_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-sans text-overline uppercase not-italic text-accent">
          Programme
        </legend>
        <div className="flex flex-wrap gap-2">
          {programs.map((program) => (
            <button
              key={program.id}
              type="button"
              aria-pressed={draft.program === program.id}
              onClick={() => pickProgram(program.id)}
              className={`${CHIP} ${
                draft.program === program.id ? CHIP_ON : CHIP_OFF
              }`}
            >
              {program.name}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={draft.program === "free"}
            onClick={() => pickProgram("free")}
            className={`${CHIP} ${
              draft.program === "free" ? CHIP_ON : CHIP_OFF
            }`}
          >
            Séance libre
          </button>
        </div>
      </fieldset>

      <button
        type="button"
        onClick={() => onApply(draft)}
        className="flex h-btn items-center justify-center rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action"
      >
        {count === 1 ? "Voir 1 séance" : `Voir ${count} séances`}
      </button>
    </BottomSheet>
  );
}

export default HistoryFilterSheet;
