import { useEffect, useRef, useState } from "react";
import {
  formatLongDate,
  formatMonthTitle,
  formatSessionDate,
  isPlannedDateInRange,
  listMonthGrid,
  shiftMonth,
  todayInParis,
  toYearMonth,
  WEEKDAY_INITIALS,
} from "shared";
import chevronLeftIcon from "../../../assets/icons/ui/chevrons/chevron-left.svg";
import chevronRightIcon from "../../../assets/icons/ui/chevrons/chevron-right.svg";
import Icon from "../../../components/Icon";

type Props = {
  // The date currently chosen for the session
  value: string;
  onConfirm: (date: string) => void;
  onClose: () => void;
};

// Screen A2b: "Date de la séance". A month at a time, Monday first; a past
// date is allowed (a session declared after the fact), within the range of
// the server (one year back, two years ahead). "Valider la date" confirms.
function DatePickerSheet({ value, onConfirm, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const today = todayInParis();
  const [chosen, setChosen] = useState(value);
  const [month, setMonth] = useState(toYearMonth(value));

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

  function pickToday() {
    setChosen(today);
    setMonth(toYearMonth(today));
  }

  const dayButton =
    "flex h-10 w-full items-center justify-center rounded-btn text-sm font-semibold disabled:opacity-40";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="date-picker-title"
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-hero border border-base-300 bg-base-100 p-4 text-base-content shadow-card backdrop:bg-neutral/60"
    >
      <div className="flex items-center justify-between">
        <h2 id="date-picker-title" className="text-display-sm">
          Date de la séance
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-tap px-2 font-semibold text-secondary"
        >
          Fermer
        </button>
      </div>

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
        {WEEKDAY_INITIALS.map((initial, index) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: the initials repeat (M, M), only their position tells them apart
            key={index}
            className="text-center text-overline uppercase text-muted"
          >
            {initial}
          </span>
        ))}
      </div>
      <fieldset className="mt-1 grid grid-cols-7 gap-1">
        <legend className="sr-only">
          Jours de {formatMonthTitle(month).toLowerCase()}
        </legend>
        {listMonthGrid(month).flatMap((week, weekIndex) =>
          week.map((date, dayIndex) =>
            date === null ? (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: an empty cell has nothing but its place in the grid
                key={`empty-${weekIndex}-${dayIndex}`}
                aria-hidden="true"
              />
            ) : (
              <button
                key={date}
                type="button"
                onClick={() => setChosen(date)}
                disabled={!isPlannedDateInRange(date, today)}
                aria-pressed={date === chosen}
                aria-label={`${formatLongDate(date)}${date === today ? ", aujourd'hui" : ""}`}
                className={`${dayButton} ${
                  date === chosen
                    ? "bg-primary text-primary-content shadow-action"
                    : date === today
                      ? "border border-secondary text-secondary"
                      : "border border-transparent"
                }`}
              >
                {Number(date.slice(8, 10))}
              </button>
            ),
          ),
        )}
      </fieldset>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={pickToday}
          className="min-h-tap rounded-btn border border-base-300 bg-base-100 px-3 text-sm font-semibold"
        >
          Aujourd'hui
        </button>
        <p aria-live="polite" className="text-right text-sm">
          <span className="text-overline uppercase text-accent">Choisie</span>
          <br />
          <span className="font-semibold">{formatSessionDate(chosen)}</span>
        </p>
      </div>

      <button
        type="button"
        onClick={() => onConfirm(chosen)}
        className="mt-4 flex h-btn w-full items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action"
      >
        Valider la date
      </button>
    </dialog>
  );
}

export default DatePickerSheet;
