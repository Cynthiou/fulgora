import { useEffect, useState } from "react";
import type { SetMeasure } from "shared";
import minusIcon from "../../../assets/icons/ui/v3/minus.svg";
import pencilIcon from "../../../assets/icons/ui/v3/pencil.svg";
import plusIcon from "../../../assets/icons/ui/v3/plus-bold.svg";
import Icon from "../../../components/Icon";
import { useHoldRepeat } from "../../../hooks/useHoldRepeat";

// "62,5" on screen for 62.5 (French comma, up to three decimals).
function formatNumber(value: number | null): string {
  return value === null
    ? ""
    : String(Math.round(value * 1000) / 1000).replace(".", ",");
}

// Accepts "40", "40,5" and "40.5"; null when the case is emptied.
function parseNumber(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") {
    return null;
  }
  const value = Number(trimmed.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

const STEP_BUTTON =
  "grid size-[42px] shrink-0 place-items-center rounded-[10px] bg-step-btn text-base-content";

type Props = {
  measure: SetMeasure;
  // The value as it is read on screen, null when the case is empty
  value: number | null;
  onChange: (value: number | null) => void;
  onStep: (direction: 1 | -1) => void;
  // 62 with three cases, 56 with four, 50 with five (handoff)
  height: number;
  // The last case closes the keyboard instead of going to the next one
  isLast: boolean;
};

// One case of the sheet of the sets: the cyan label, the big number with
// its unit, and the − / + of the handoff. The number is a real input, so
// the phone opens its own decimal keyboard; "Suivant" walks to the next
// case and "OK" closes it on the last one.
function MeasureCell({
  measure,
  value,
  onChange,
  onStep,
  height,
  isLast,
}: Props) {
  const [text, setText] = useState(() => formatNumber(value));
  const decrease = useHoldRepeat(() => onStep(-1));
  const increase = useHoldRepeat(() => onStep(1));

  // The value changed from outside (− / +, "Reprendre"): show it.
  useEffect(() => {
    setText((current) =>
      parseNumber(current) === value ? current : formatNumber(value),
    );
  }, [value]);

  function handleText(next: string) {
    setText(next);
    onChange(parseNumber(next));
  }

  const id = `measure-${measure.key}`;
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-[7px] block whitespace-nowrap font-sans text-[10px] font-extrabold uppercase not-italic tracking-[0.14em] text-accent"
      >
        {measure.head}
      </label>
      <div
        style={{ height: `${height}px` }}
        className="flex items-center gap-3 rounded-[12px] border border-cell-border bg-cell pr-2 pl-4 focus-within:border-2 focus-within:border-brand focus-within:pr-[7px] focus-within:pl-[15px]"
      >
        <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
          <input
            id={id}
            type="text"
            inputMode="decimal"
            enterKeyHint={isLast ? "done" : "next"}
            value={text}
            onChange={(event) => handleText(event.target.value)}
            onFocus={(event) => event.target.select()}
            placeholder="—"
            // The case grows with what is typed, so the unit stays glued
            // to the number (the digits are tabular, one "ch" each).
            style={{ width: `${Math.max(1, text.length)}ch` }}
            className="min-w-0 bg-transparent text-[28px] font-extrabold leading-none tabular-nums outline-none placeholder:text-faint"
          />
          <span className="text-[13px] font-bold text-muted">
            {measure.unit(value)}
          </span>
          <Icon
            src={pencilIcon}
            className="size-[13px] self-center text-faint"
          />
        </span>
        <span className="flex shrink-0 gap-1.5">
          <button
            type="button"
            aria-label={`Diminuer ${measure.head.toLowerCase()}`}
            className={STEP_BUTTON}
            {...decrease}
          >
            <Icon src={minusIcon} className="size-[15px]" />
          </button>
          <button
            type="button"
            aria-label={`Augmenter ${measure.head.toLowerCase()}`}
            className={STEP_BUTTON}
            {...increase}
          >
            <Icon src={plusIcon} className="size-[15px]" />
          </button>
        </span>
      </div>
    </div>
  );
}

export default MeasureCell;
