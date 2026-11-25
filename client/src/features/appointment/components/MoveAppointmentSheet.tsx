import { useEffect, useRef, useState } from "react";
import {
  computeAppointmentStatus,
  formatConfirmDeadline,
  formatLongDate,
  formatMonthTitle,
  isPlannedDateInRange,
  listMonthWeeks,
  STATUSES,
  shiftMonth,
  todayInParis,
  toYearMonth,
  WEEKDAY_INITIALS,
  WEEKDAY_NAMES,
} from "shared";
import chevronLeftIcon from "../../../assets/icons/ui/chevrons/chevron-left.svg";
import chevronRightIcon from "../../../assets/icons/ui/chevrons/chevron-right.svg";
import Icon from "../../../components/Icon";
import TextField from "../../../components/TextField";
import StatusDot from "./StatusDot";

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
// dotted, the chosen one filled. The time stays optional, and the box at the
// bottom says which status the session will take (RM-068).
function MoveAppointmentSheet({
  sessionName,
  plannedDate,
  plannedTime,
  isSending,
  error,
  onConfirm,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const today = todayInParis();
  const [chosen, setChosen] = useState(plannedDate);
  const [time, setTime] = useState(plannedTime ?? "");
  const [month, setMonth] = useState(toYearMonth(plannedDate));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null || dialog.open) {
      return;
    }
    const opener = document.activeElement;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus();
      }
    };
  }, []);

  const nextStatus = computeAppointmentStatus(chosen, today);
  const hasChanged = chosen !== plannedDate || time !== (plannedTime ?? "");

  const dayButton =
    "flex h-10 w-full items-center justify-center rounded-btn text-sm font-semibold disabled:opacity-40";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="move-title"
      onClose={onClose}
      className="mt-auto mb-0 w-full max-w-md rounded-t-hero border border-base-300 bg-base-100 p-4 text-base-content shadow-card backdrop:bg-neutral/60"
    >
      <div className="flex justify-center pb-3">
        <span
          aria-hidden="true"
          className="h-1 w-10 rounded-full bg-base-300"
        />
      </div>

      <h2 id="move-title" className="text-display-md">
        Déplacer « {sessionName} »
      </h2>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, -1))}
          aria-label="Mois précédent"
          className="flex size-tap items-center justify-center rounded-btn text-secondary"
        >
          <Icon src={chevronLeftIcon} className="size-6" />
        </button>
        <p aria-live="polite" className="font-semibold">
          {formatMonthTitle(month)}
        </p>
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, 1))}
          aria-label="Mois suivant"
          className="flex size-tap items-center justify-center rounded-btn text-secondary"
        >
          <Icon src={chevronRightIcon} className="size-6" />
        </button>
      </div>

      <div aria-hidden="true" className="mt-2 grid grid-cols-7 gap-1">
        {WEEKDAY_NAMES.map((name, index) => (
          <span
            key={name}
            className="text-center text-overline uppercase text-muted"
          >
            {WEEKDAY_INITIALS[index]}
          </span>
        ))}
      </div>
      <fieldset className="mt-1 grid grid-cols-7 gap-1">
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
                className={`${dayButton} ${
                  slot.day === chosen
                    ? "bg-neutral text-neutral-content"
                    : slot.day === plannedDate
                      ? "border border-dashed border-neutral"
                      : "border border-transparent"
                }`}
              >
                {Number(slot.day.slice(8, 10))}
              </button>
            ),
          ),
        )}
      </fieldset>

      <div className="mt-3">
        <TextField
          id="move-time"
          label="Heure (facultatif)"
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
        />
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-card border border-base-300 p-3">
        <p className="min-w-0 flex-1">
          <span className="block text-overline uppercase text-accent">
            Avant
          </span>
          <span className="block text-sm text-muted line-through">
            {shortMoment(plannedDate, plannedTime)}
          </span>
        </p>
        <span aria-hidden="true" className="text-muted">
          →
        </span>
        <p className="min-w-0 flex-1">
          <span className="block text-overline uppercase text-accent">
            Après
          </span>
          <span className="block text-sm font-semibold">
            {shortMoment(chosen, time === "" ? null : time)}
          </span>
        </p>
      </div>

      <p className="mt-2 flex items-center justify-between gap-2 rounded-card border border-dashed border-base-300 p-3 text-sm">
        Statut après déplacement
        <span className="flex shrink-0 items-center gap-1 font-semibold">
          <StatusDot status={nextStatus} />
          {STATUSES[nextStatus].label}
        </span>
      </p>
      {nextStatus === "to_confirm" && (
        <p className="mt-1 text-sm text-muted">
          À confirmer jusqu'au {formatConfirmDeadline(chosen)}.
        </p>
      )}

      {error !== null && (
        <p role="alert" className="mt-2 font-semibold">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isSending}
          className="flex h-btn flex-1 items-center justify-center rounded-btn border border-base-300 bg-base-100 font-semibold disabled:opacity-60"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={() => onConfirm(chosen, time === "" ? null : time)}
          disabled={isSending || !hasChanged}
          className="flex h-btn flex-[1.4] items-center justify-center rounded-btn bg-neutral font-extrabold uppercase tracking-wide text-neutral-content disabled:opacity-60"
        >
          {isSending ? "Déplacement…" : "Confirmer"}
        </button>
      </div>
    </dialog>
  );
}

export default MoveAppointmentSheet;
