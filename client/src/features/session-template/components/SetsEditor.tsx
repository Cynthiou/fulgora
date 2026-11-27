import { useState } from "react";
import { Link } from "react-router";
import {
  createEmptySet,
  type DraftExercise,
  formatMinSec,
  formatSetValues,
  fromSetLines,
  getMeasureProfile,
  getSetMeasures,
  MAX_SETS_PER_EXERCISE,
  NO_SPLIT,
  OPTIONAL_CARDIO_FIELDS,
  type PlannedSetValues,
  readSideSplit,
  type SetLine,
  type SetValueField,
  type SideSplit,
  toSetLines,
} from "shared";
import chevronRightIcon from "../../../assets/icons/ui/v3/chevron-right.svg";
import infoIcon from "../../../assets/icons/ui/v3/info.svg";
import plusIcon from "../../../assets/icons/ui/v3/plus.svg";
import timerIcon from "../../../assets/icons/ui/v3/timer.svg";
import trashIcon from "../../../assets/icons/ui/v3/trash.svg";
import BottomSheet from "../../../components/BottomSheet";
import {
  CTA,
  DASHED_BUTTON,
  SECTION_COUNT,
  SECTION_TITLE,
  SHEET_TITLE,
} from "../../../components/formClasses";
import Icon from "../../../components/Icon";
import PageHeader from "../../../components/PageHeader";
import RestInput from "./RestInput";
import SetLineSheet from "./SetLineSheet";

// Which line the sheet is writing, and whether it was saved once.
type Editing = { index: number; isNew: boolean } | null;

type Props = {
  exercise: DraftExercise;
  // Place of the exercise in its block, from 0, and how many there are
  index: number;
  total: number;
  // The type of the block it belongs to, written in the header
  blockLabel: string;
  // Every change of the sets goes through here, one row per set
  onChangeSets: (sets: PlannedSetValues[]) => void;
  onChangeRest: (seconds: number | null) => void;
  // "Chaque côté" of the sheet (US-51, RM-084)
  onChangePerSide: (isPerSide: boolean) => void;
  // The trash can of the header: the exercise leaves the block
  onRemove: () => void;
  // "Valider l'exercice" and the back arrow both return to the block
  onDone: () => void;
  // What the last finished session holds for this exercise (null while
  // it is being read, or when there is none)
  last: SetLine | null;
};

// Screen of the handoff des séries: the lines already written, one card
// each, and the sheet that writes one. A line stands for n sets carrying
// the same values; the draft keeps storing one row per set.
function SetsEditor({
  exercise,
  index,
  total,
  blockLabel,
  onChangeSets,
  onChangeRest,
  onChangePerSide,
  onRemove,
  onDone,
  last,
}: Props) {
  const lines = toSetLines(exercise.sets);
  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState<SetLine | null>(null);
  const [split, setSplit] = useState<SideSplit>(NO_SPLIT);
  const [isPickingRest, setIsPickingRest] = useState(false);
  // The optional measures of a cardio machine ("Modifier" of the handoff)
  const [extraFields, setExtraFields] = useState<SetValueField[]>([]);

  const profile = getMeasureProfile(
    exercise.measure_codes,
    exercise.is_bodyweight,
  );
  const isCardio = profile === "cardio";
  const word = isCardio ? "tour" : "série";
  const setCount = exercise.sets.length;
  const isPerSide = exercise.is_per_side ?? false;
  // "Chaque côté" is offered by the catalog, or already chosen (RM-084)
  const canBePerSide = (exercise.allows_per_side ?? false) || isPerSide;
  const isFull = setCount >= MAX_SETS_PER_EXERCISE;

  // The lines as the list shows them: the one being added is not saved yet.
  const savedLines =
    editing?.isNew === true
      ? lines.filter((_, position) => position !== editing.index)
      : lines;

  function writeLines(next: SetLine[]) {
    onChangeSets(fromSetLines(next));
  }

  function openLine(position: number) {
    const line = lines[position];
    if (line === undefined) {
      return;
    }
    setDraft({ count: line.count, values: { ...line.values } });
    setSplit(readSideSplit(line.values));
    setEditing({ index: position, isNew: false });
  }

  // A new line copies the one before it, with one set (handoff).
  function addLine() {
    const previous = lines[lines.length - 1];
    const values =
      previous === undefined ? createEmptySet() : { ...previous.values };
    setDraft({ count: 1, values });
    setSplit(readSideSplit(values));
    setEditing({ index: lines.length, isNew: true });
  }

  function closeSheet() {
    setEditing(null);
    setDraft(null);
  }

  function saveLine() {
    if (editing === null || draft === null) {
      return;
    }
    const next = [...lines];
    next[editing.index] = draft;
    writeLines(next);
    closeSheet();
  }

  function deleteLine() {
    if (editing === null) {
      return;
    }
    // A line that was never saved simply goes away.
    if (!editing.isNew) {
      writeLines(lines.filter((_, position) => position !== editing.index));
    }
    closeSheet();
  }

  // "Modifier" shows the measures a cardio machine keeps aside, its
  // distance and its calories, or puts them away again (handoff).
  function toggleExtras() {
    setExtraFields((current) =>
      current.length === 0 ? OPTIONAL_CARDIO_FIELDS : [],
    );
  }

  const measureNames = getSetMeasures(exercise, NO_SPLIT, extraFields)
    .filter((measure) => measure.key !== "count")
    .map((measure) => measure.head.toLowerCase());
  const restSeconds = exercise.default_rest_seconds;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <PageHeader
        variant="form"
        onBack={onDone}
        backLabel="Retour au bloc"
        overline={`Exercice ${index + 1} sur ${total}`}
        title={blockLabel}
        // The name of the exercise is the heading of the page, in big
        asHeading={false}
        strongBack
        action={
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Retirer ${exercise.name}`}
            className="grid size-9 place-items-center rounded-full bg-back-strong text-muted"
          >
            <Icon src={trashIcon} className="size-4" />
          </button>
        }
      />

      <div className="flex flex-1 flex-col px-[22px] pt-3.5 pb-28">
        <h1 className="font-display text-[28px] font-black uppercase not-italic leading-[1.15] [transform:skewX(-10deg)] [transform-origin:left]">
          {exercise.name}
        </h1>
        <div className="mt-2 mb-[18px] flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-xs font-semibold text-card-sub">
            {exercise.meta ?? ""}
          </span>
          <Link
            to={`/catalogue/${exercise.exercise_id}`}
            state={{ name: exercise.name }}
            className="flex shrink-0 items-center gap-1 text-xs font-bold text-secondary"
          >
            <Icon src={infoIcon} className="size-[13px]" />
            Fiche
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsPickingRest(true)}
          className="mb-[22px] flex h-[46px] items-center gap-2.5 rounded-[12px] border border-base-300 bg-base-100 py-0 pr-3 pl-2 text-left shadow-card"
        >
          <span
            aria-hidden="true"
            className="grid size-[30px] shrink-0 place-items-center rounded-[8px] bg-back-strong text-muted"
          >
            <Icon src={timerIcon} className="size-[15px]" />
          </span>
          <span className="flex-1 text-[13px] font-semibold">
            Repos entre {isCardio ? "étapes" : "séries"}
          </span>
          <span className="font-display text-[20px] font-black not-italic tabular-nums [transform:skewX(-10deg)]">
            {restSeconds === null ? "—" : formatMinSec(restSeconds)}
          </span>
          <Icon src={chevronRightIcon} className="size-4 shrink-0 text-muted" />
        </button>

        <div className="mb-2.5 flex items-baseline justify-between gap-2">
          <h2 className={SECTION_TITLE}>{isCardio ? "Étapes" : "Séries"}</h2>
          <p className={`${SECTION_COUNT} whitespace-nowrap`}>
            {setCount === 0
              ? `Aucune ${word}`
              : `${setCount} ${word}${setCount > 1 ? "s" : ""}`}
          </p>
        </div>

        {isCardio && (
          <p className="-mt-1 mb-3 text-[11px] font-semibold text-card-sub">
            {measureNames.join(", ")} ·{" "}
            <button
              type="button"
              onClick={toggleExtras}
              className="font-bold text-secondary"
            >
              Modifier
            </button>
          </p>
        )}

        <ul
          aria-label={isCardio ? "Étapes" : "Séries"}
          className="flex flex-col gap-2"
        >
          {savedLines.map((line, position) => (
            // A line has no identity of its own: it is the run of sets at
            // that place, and the list never reorders itself.
            // biome-ignore lint/suspicious/noArrayIndexKey: the place is the identity
            <li key={position}>
              <button
                type="button"
                onClick={() => openLine(position)}
                className="flex w-full items-center gap-2.5 rounded-[12px] border border-base-300 bg-base-100 py-3 pr-2.5 pl-3.5 text-left shadow-card"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">
                    {isCardio
                      ? `Étape ${position + 1}`
                      : `${line.count} ${word}${line.count > 1 ? "s" : ""}`}
                  </span>
                  <span className="mt-0.5 block text-xs font-semibold tabular-nums text-card-sub">
                    {formatSetValues(
                      line.values,
                      exercise.measure_codes,
                      exercise.is_bodyweight,
                    )}
                  </span>
                </span>
                <Icon
                  src={chevronRightIcon}
                  className="size-4 shrink-0 text-muted"
                />
              </button>
            </li>
          ))}
        </ul>

        {savedLines.length === 0 && (
          <p className="rounded-[12px] border border-base-300 bg-base-100 px-4 py-[22px] text-center text-[13px] font-semibold text-muted">
            Aucune {word} pour l'instant.
          </p>
        )}

        <button
          type="button"
          onClick={addLine}
          disabled={isFull}
          aria-describedby={isFull ? "sets-limit" : undefined}
          className={`mt-2 ${DASHED_BUTTON}`}
        >
          <Icon src={plusIcon} className="size-[15px]" />
          {isCardio ? "Ajouter une étape" : "Ajouter une série différente"}
        </button>
        {isFull && (
          <p
            id="sets-limit"
            className="mt-2 text-[11px] font-semibold text-muted"
          >
            {MAX_SETS_PER_EXERCISE} séries au maximum par exercice
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 bg-base-200 px-[22px] pt-3 pb-[18px]">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={onDone}
            disabled={savedLines.length === 0}
            className={CTA}
          >
            Valider l'exercice
          </button>
        </div>
      </div>

      {editing !== null && draft !== null && (
        <SetLineSheet
          exercise={exercise}
          line={draft}
          index={editing.index}
          isNew={editing.isNew}
          split={split}
          onChangeSplit={setSplit}
          canBePerSide={canBePerSide}
          onChangePerSide={onChangePerSide}
          extraFields={extraFields}
          onChange={setDraft}
          onSave={saveLine}
          onCancel={closeSheet}
          onDelete={deleteLine}
          last={last}
        />
      )}

      {isPickingRest && (
        <BottomSheet
          variant="form"
          label="Repos par défaut"
          onClose={() => setIsPickingRest(false)}
          closeLabel={null}
        >
          <div className="flex items-center justify-between gap-2 px-1 pb-3">
            <h2 className={SHEET_TITLE}>
              Repos entre {isCardio ? "étapes" : "séries"}
            </h2>
            <button
              type="button"
              onClick={() => setIsPickingRest(false)}
              className="text-[13px] font-bold text-muted"
            >
              Fermer
            </button>
          </div>
          <RestInput
            id="default-rest"
            label={`Repos entre ${isCardio ? "étapes" : "séries"}`}
            value={restSeconds}
            onChange={onChangeRest}
          />
        </BottomSheet>
      )}
    </div>
  );
}

export default SetsEditor;
