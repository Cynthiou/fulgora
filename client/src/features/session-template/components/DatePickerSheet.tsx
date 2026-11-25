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
import checkIcon from "../../../assets/icons/ui/app/check.svg";
import chevronLeftIcon from "../../../assets/icons/ui/app/chevron-left.svg";
import chevronRightIcon from "../../../assets/icons/ui/app/chevron-right.svg";
import BottomSheet from "../../../components/BottomSheet";
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
    "flex h-9 w-full items-center justify-center rounded-btn text-[13px] disabled:opacity-40";

  return (
    <BottomSheet label="Date de la séance" onClose={onClose} closeLabel={null}>
      <div className="flex items-center justify-between gap-2">
        <h2 id="date-picker-title" className="text-[26px] leading-none">
          Date de la séance
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-tap px-1 text-sm font-semibold text-secondary"
        >
          Fermer
        </button>
      </div>

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
          {WEEKDAY_INITIALS.map((initial, index) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: the initials repeat (M, M), only their position tells them apart
              key={index}
              className="py-0.5 text-center text-[10px] font-bold text-muted"
            >
              {initial}
            </span>
          ))}
        </div>
        <fieldset className="grid grid-cols-7 gap-0.5">
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
                      ? "bg-pick font-extrabold text-pick-content"
                      : date === today
                        ? "border border-secondary font-bold text-secondary"
                        : "font-semibold"
                  }`}
                >
                  {Number(date.slice(8, 10))}
                </button>
              ),
            ),
          )}
        </fieldset>
      </div>

      {/* The legend of the mockup, then the date in words (A2b) */}
      <div className="flex items-center gap-4 text-xs text-muted">
        <button
          type="button"
          onClick={pickToday}
          className="flex min-h-tap items-center gap-1.5 font-medium"
        >
          <span
            aria-hidden="true"
            className="size-3 rounded-sm border border-secondary"
          />
          Aujourd'hui
        </button>
        <span className="flex items-center gap-1.5 font-medium">
          <span aria-hidden="true" className="size-3 rounded-sm bg-pick" />
          Choisie
        </span>
      </div>
      <p aria-live="polite" className="text-sm">
        Séance le{" "}
        <b className="font-bold">
          {formatSessionDate(chosen).replace("Séance le ", "")}
        </b>
      </p>

      <button
        type="button"
        onClick={() => onConfirm(chosen)}
        className="flex h-btn w-full items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action"
      >
        <Icon src={checkIcon} className="size-[18px]" />
        Valider la date
      </button>
    </BottomSheet>
  );
}

export default DatePickerSheet;
