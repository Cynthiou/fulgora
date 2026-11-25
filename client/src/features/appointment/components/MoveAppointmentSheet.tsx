import { useState } from "react";
import {
  computeAppointmentStatus,
  formatConfirmDeadline,
  formatLongDate,
  formatMonthTitle,
  isPlannedDateInRange,
  listMonthWeeks,
  shiftMonth,
  todayInParis,
  toYearMonth,
  WEEKDAY_INITIALS,
  WEEKDAY_NAMES,
} from "shared";
import checkIcon from "../../../assets/icons/ui/app/check.svg";
import chevronLeftIcon from "../../../assets/icons/ui/app/chevron-left.svg";
import chevronRightIcon from "../../../assets/icons/ui/app/chevron-right.svg";
import BottomSheet from "../../../components/BottomSheet";
import Icon from "../../../components/Icon";
import StatusChip from "../../../components/StatusChip";
import TextField from "../../../components/TextField";

type Props = {
  sessionName: string;
  plannedDate: string;
  plannedTime: string | null;
  isSending: boolean;
  error: string | null;
  onConfirm: (date: string, time: string | null) => void;
  onClose: () => void;
};

// "Jeu 26 nov · 07:00", the short form of the before/after box.
function shortMoment(date: string, time: string | null): string {
  const long = formatLongDate(date);
  return time === null ? long : `${long} · ${time}`;
}

// Screen CAL-05: "Déplacer « Jambes »". A month at a time, the current date
// ringed in blue, the chosen one filled. The time stays optional, and the
// box at the bottom says which status the session will take (RM-068).
function MoveAppointmentSheet({
  sessionName,
  plannedDate,
  plannedTime,
  isSending,
  error,
  onConfirm,
  onClose,
}: Props) {
  const today = todayInParis();
  const [chosen, setChosen] = useState(plannedDate);
  const [time, setTime] = useState(plannedTime ?? "");
  const [month, setMonth] = useState(toYearMonth(plannedDate));

  const nextStatus = computeAppointmentStatus(chosen, today);
  const hasChanged = chosen !== plannedDate || time !== (plannedTime ?? "");

  return (
    <BottomSheet
      label={`Déplacer ${sessionName}`}
      onClose={onClose}
      closeLabel={null}
    >
      <h2 id="move-title" className="text-[26px] leading-none">
        Déplacer « {sessionName} »
      </h2>

      {/* The month, its title and its arrows inside one white card (CAL-05) */}
      <div className="flex flex-col gap-2 rounded-card border border-base-300 bg-base-100 p-3 shadow-card">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, -1))}
            aria-label="Mois précédent"
            className="-my-3 grid size-tap place-items-center text-muted"
          >
            <Icon src={chevronLeftIcon} className="size-[18px]" />
          </button>
          <p aria-live="polite" className="text-[15px] font-extrabold">
            {formatMonthTitle(month)}
          </p>
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, 1))}
            aria-label="Mois suivant"
            className="-my-3 grid size-tap place-items-center text-muted"
          >
            <Icon src={chevronRightIcon} className="size-[18px]" />
          </button>
        </div>

        <div aria-hidden="true" className="grid grid-cols-7 gap-0.5">
          {WEEKDAY_NAMES.map((name, index) => (
            <span
              key={name}
              className="py-0.5 text-center text-[10px] font-bold text-muted"
            >
              {WEEKDAY_INITIALS[index]}
            </span>
          ))}
        </div>
        <fieldset className="grid grid-cols-7 gap-0.5">
          <legend className="sr-only">
            Jours de {formatMonthTitle(month).toLocaleLowerCase("fr-FR")}
          </legend>
          {listMonthWeeks(month).flatMap((week) =>
            week.map((slot) =>
              slot.day === null ? (
                <span key={slot.key} aria-hidden="true" />
              ) : (
                <button
                  key={slot.key}
                  type="button"
                  onClick={() => setChosen(slot.day as string)}
                  disabled={!isPlannedDateInRange(slot.day, today)}
                  aria-pressed={slot.day === chosen}
                  aria-label={`${formatLongDate(slot.day)}${
                    slot.day === plannedDate ? ", date actuelle" : ""
                  }`}
                  className={`flex h-9 w-full items-center justify-center rounded-btn text-[13px] disabled:opacity-40 ${
                    slot.day === chosen
                      ? "bg-pick font-extrabold text-pick-content"
                      : slot.day === plannedDate
                        ? "border border-secondary font-bold text-secondary"
                        : "font-semibold"
                  }`}
                >
                  {Number(slot.day.slice(8, 10))}
                </button>
              ),
            ),
          )}
        </fieldset>
      </div>

      <TextField
        id="move-time"
        label="Heure (facultatif)"
        type="time"
        value={time}
        onChange={(event) => setTime(event.target.value)}
      />

      {/* "Avant → après", then the status the session will take (CAL-05) */}
      <div className="flex flex-col gap-2.5 rounded-card border border-base-300 bg-base-100 p-3.5 shadow-card">
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1">
            <span className="block text-overline uppercase text-muted">
              Avant
            </span>
            <span className="block text-[13px] text-muted line-through">
              {shortMoment(plannedDate, plannedTime)}
            </span>
          </p>
          <Icon
            src={chevronRightIcon}
            className="size-[18px] shrink-0 text-secondary"
          />
          <p className="min-w-0 flex-1">
            <span className="block text-overline uppercase text-accent">
              Après
            </span>
            <span className="block text-[13px] font-bold">
              {shortMoment(chosen, time === "" ? null : time)}
            </span>
          </p>
        </div>
        <p className="flex items-center justify-between gap-2 border-t border-base-300 pt-2.5 text-[13px] text-muted">
          Statut après déplacement
          <StatusChip status={nextStatus} />
        </p>
        {nextStatus === "to_confirm" && (
          <p className="text-xs text-muted">
            À confirmer jusqu'au {formatConfirmDeadline(chosen)}.
          </p>
        )}
      </div>

      {error !== null && (
        <p role="alert" className="text-sm font-semibold">
          {error}
        </p>
      )}

      <div className="grid grid-cols-[1fr_1.4fr] gap-2.5">
        <button
          type="button"
          onClick={onClose}
          disabled={isSending}
          className="flex h-btn items-center justify-center rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card disabled:opacity-60"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={() => onConfirm(chosen, time === "" ? null : time)}
          disabled={isSending || !hasChanged}
          className="flex h-btn items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60"
        >
          <Icon src={checkIcon} className="size-[18px]" />
          {isSending ? "Déplacement…" : "Confirmer"}
        </button>
      </div>
    </BottomSheet>
  );
}

export default MoveAppointmentSheet;
