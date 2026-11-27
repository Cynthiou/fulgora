import type { FormEvent } from "react";
import {
  type DraftExercise,
  formatSetLineShort,
  getSetMeasures,
  type SetLine,
  type SetMeasure,
  type SetValueField,
  type SideSplit,
  stepMeasure,
} from "shared";
import checkIcon from "../../../assets/icons/ui/v3/check.svg";
import historyIcon from "../../../assets/icons/ui/v3/history.svg";
import pencilIcon from "../../../assets/icons/ui/v3/pencil.svg";
import rotateIcon from "../../../assets/icons/ui/v3/rotate.svg";
import trashIcon from "../../../assets/icons/ui/v3/trash.svg";
import BottomSheet from "../../../components/BottomSheet";
import { SHEET_TITLE } from "../../../components/formClasses";
import Icon from "../../../components/Icon";
import type { LastSets } from "../hooks/useLastSets";
import MeasureCell from "./MeasureCell";

// A case is 62 px tall, 56 with four of them, 50 with five (handoff).
function cellHeight(count: number): number {
  return count > 4 ? 50 : count > 3 ? 56 : 62;
}

const CHIP =
  "flex h-[30px] shrink-0 items-center gap-[5px] rounded-[15px] px-2.5 text-xs font-bold";

type Props = {
  exercise: DraftExercise;
  // The line being written, and where it sits in the list
  line: SetLine;
  index: number;
  // A line that was not saved yet: "Annuler" drops it
  isNew: boolean;
  // Which goals are asked apart, and how to change that
  split: SideSplit;
  onChangeSplit: (split: SideSplit) => void;
  // "Chaque côté": the exercise is done one side then the other (RM-084)
  canBePerSide: boolean;
  onChangePerSide: (isPerSide: boolean) => void;
  // The optional measures of a cardio machine the user turned on
  extraFields: SetValueField[];
  onChange: (line: SetLine) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  // What the last finished session holds for this exercise
  last: LastSets;
};

// The sheet of the handoff: the recap of the line being written, what was
// done last time, one case per measure, and the two buttons. It opens
// without the keyboard; touching a number calls the one of the phone.
function SetLineSheet({
  exercise,
  line,
  index,
  isNew,
  split,
  onChangeSplit,
  canBePerSide,
  onChangePerSide,
  extraFields,
  onChange,
  onSave,
  onCancel,
  onDelete,
  last,
}: Props) {
  const isPerSide = exercise.is_per_side ?? false;
  // What was done last time, once the server has answered
  const lastLine = last.line;
  const measures = getSetMeasures(exercise, split, extraFields);
  const isCardio = measures[0]?.head === "NOMBRE DE TOURS";
  const height = cellHeight(measures.length);

  function readValue(measure: SetMeasure): number | null {
    if (measure.key === "count") {
      return line.count;
    }
    const stored = line.values[measure.key];
    return stored === null ? null : measure.toDisplay(stored);
  }

  function writeValue(measure: SetMeasure, shown: number | null) {
    if (measure.key === "count") {
      onChange({ ...line, count: shown === null ? 1 : Math.round(shown) });
      return;
    }
    onChange({
      ...line,
      values: {
        ...line.values,
        [measure.key]: shown === null ? null : measure.fromDisplay(shown),
      },
    });
  }

  function step(measure: SetMeasure, direction: 1 | -1) {
    if (measure.key === "count") {
      onChange({ ...line, count: Math.max(1, line.count + direction) });
      return;
    }
    onChange({
      ...line,
      values: {
        ...line.values,
        [measure.key]: stepMeasure(
          measure,
          line.values[measure.key],
          direction,
        ),
      },
    });
  }

  // Every case that must be filled is filled (handoff): an optional one,
  // the added weight of a body weight exercise for instance, may stay empty.
  const isComplete = measures.every(
    (measure) =>
      measure.isOptional === true ||
      measure.key === "count" ||
      line.values[measure.key] !== null,
  );

  const title = formatSetLineShort(
    line.count,
    line.values,
    exercise.measure_codes,
    exercise.is_bodyweight,
    isPerSide,
  );
  const isEmpty = measures.every(
    (measure) => measure.key === "count" || line.values[measure.key] === null,
  );

  // The keyboard says "Suivant": the next case takes the focus.
  function goToNextCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Array.from(
      event.currentTarget.querySelectorAll<HTMLInputElement>("input"),
    );
    const next = fields.indexOf(document.activeElement as HTMLInputElement);
    if (next >= 0 && next < fields.length - 1) {
      fields[next + 1]?.focus();
    } else {
      fields[next]?.blur();
    }
  }

  return (
    <BottomSheet
      variant="form"
      label={`${isCardio ? "Étape" : "Ligne"} ${index + 1}`}
      onClose={onCancel}
      closeLabel={null}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.16em] text-secondary">
            {isCardio ? "Étape" : "Ligne"} {index + 1}
          </p>
          <h2 className={`mt-0.5 truncate ${SHEET_TITLE}`}>
            {isEmpty ? "À remplir" : title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 py-0.5 text-[13px] font-bold text-muted"
        >
          Annuler
        </button>
      </div>

      {!last.isKnown ? null : lastLine === null ? (
        <p className="mt-1.5 mb-3 text-xs font-semibold text-muted">
          Première fois sur cet exercice
        </p>
      ) : (
        <div className="mt-2 mb-3 flex items-center gap-2 rounded-[10px] bg-cell py-2 pr-2 pl-2.5 text-xs font-semibold text-muted">
          <Icon src={historyIcon} className="size-[13px]" />
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em]">
              Dernière fois
            </span>
            <span className="mt-0.5 block truncate text-xs font-bold text-base-content">
              {formatSetLineShort(
                lastLine.count,
                lastLine.values,
                exercise.measure_codes,
                exercise.is_bodyweight,
                isPerSide,
              )}
            </span>
          </span>
          <button
            type="button"
            onClick={() =>
              onChange({
                count: lastLine.count,
                values: { ...lastLine.values },
              })
            }
            className="flex h-7 shrink-0 items-center gap-1 rounded-[14px] bg-tint px-2.5 text-xs font-extrabold text-secondary"
          >
            <Icon src={rotateIcon} className="size-3" />
            Reprendre
          </button>
        </div>
      )}

      {/* A form, so the "Suivant" key of the phone walks the cases. */}
      <form
        onSubmit={goToNextCase}
        className={`flex flex-col ${measures.length > 4 ? "gap-2" : "gap-3"}`}
      >
        {measures.map((measure, position) => (
          <MeasureCell
            key={measure.key}
            measure={measure}
            value={readValue(measure)}
            height={height}
            isLast={position === measures.length - 1}
            onChange={(value) => writeValue(measure, value)}
            onStep={(direction) => step(measure, direction)}
          />
        ))}
      </form>

      <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-muted">
        <Icon src={pencilIcon} className="size-[13px]" />
        Touche un chiffre pour le taper, ou ajuste avec − / +
      </p>

      {canBePerSide && (
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="flex-1 text-xs font-semibold text-muted">
            Chaque côté
          </span>
          <button
            type="button"
            aria-pressed={isPerSide}
            onClick={() => onChangePerSide(!isPerSide)}
            className={
              isPerSide
                ? `${CHIP} border border-brand bg-tint text-secondary`
                : `${CHIP} border border-base-300 text-muted`
            }
          >
            {isPerSide && <Icon src={checkIcon} className="size-3" />}
            Côté par côté
          </button>
        </div>
      )}

      {isPerSide && (
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="flex-1 text-xs font-semibold text-muted">
            Gauche ≠ droite
          </span>
          {(
            [
              ["reps", "Rép."],
              ["weight", "Charge"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={split[key]}
              onClick={() => onChangeSplit({ ...split, [key]: !split[key] })}
              className={
                split[key]
                  ? `${CHIP} border border-brand bg-tint text-secondary`
                  : `${CHIP} border border-base-300 text-muted`
              }
            >
              {split[key] && <Icon src={checkIcon} className="size-3" />}
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onDelete}
          aria-label={isNew ? "Abandonner la ligne" : "Supprimer la ligne"}
          className="grid size-[46px] shrink-0 place-items-center rounded-[12px] bg-back-strong text-status-missed-text"
        >
          <Icon src={trashIcon} className="size-4" />
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!isComplete}
          className="h-[46px] flex-1 rounded-[12px] bg-brand text-sm font-extrabold text-primary-content disabled:bg-back-strong disabled:text-faint"
        >
          Enregistrer
        </button>
      </div>
    </BottomSheet>
  );
}

export default SetLineSheet;
