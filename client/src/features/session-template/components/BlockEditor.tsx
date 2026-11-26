import {
  BLOCK_TYPE_LABELS,
  type DraftBlock,
  findTimedBlockProblem,
  formatExerciseCountShort,
  isGoalMissing,
  isTimedBlock,
  MAX_EXERCISES_PER_BLOCK,
} from "shared";
import dumbbellLightIcon from "../../../assets/icons/ui/v3/dumbbell-light.svg";
import plusIcon from "../../../assets/icons/ui/v3/plus.svg";
import trashIcon from "../../../assets/icons/ui/v3/trash.svg";
import {
  CTA,
  DASHED_BUTTON,
  EMPTY_CARD,
  EMPTY_ICON_BOX,
  EMPTY_TEXT,
  FORM_LABEL,
  SECTION_COUNT,
} from "../../../components/formClasses";
import Icon from "../../../components/Icon";
import PageHeader from "../../../components/PageHeader";
import SortableList from "../../../components/SortableList";
import TextField from "../../../components/TextField";
import BlockExerciseRow from "./BlockExerciseRow";
import TimedBlockSettings from "./TimedBlockSettings";

const NOTE_MAX_LENGTH = 2000;

type Props = {
  block: DraftBlock;
  // Position in the session, from 0 ("Bloc 1")
  index: number;
  onChangeName: (name: string | null) => void;
  onChangeInstructions: (instructions: string | null) => void;
  // The settings of a timed block (US-43)
  onChangeRounds: (rounds: number | null) => void;
  onChangeTimeLimit: (seconds: number | null) => void;
  // "Ajouter des exercices": opens the catalog in selection mode (2.3)
  onAddExercises: () => void;
  onOpenExercise: (exerciseKey: string) => void;
  // The order of the exercises of the block (US-16)
  onMoveExercise: (from: number, to: number) => void;
  // "Enregistrer le bloc" and the back arrow both return to the session
  onDone: () => void;
  // The trash can of the header: removes the whole block
  onRemoveBlock: () => void;
};

// Screens 2.2 and 3.2: one block of the draft, empty then filled. Changes
// apply to the draft as they are typed; "Enregistrer le bloc" simply goes
// back to the session. An empty block offers the catalog instead, as its
// one orange button.
function BlockEditor({
  block,
  index,
  onChangeName,
  onChangeInstructions,
  onChangeRounds,
  onChangeTimeLimit,
  onAddExercises,
  onOpenExercise,
  onMoveExercise,
  onDone,
  onRemoveBlock,
}: Props) {
  const typeLabel = BLOCK_TYPE_LABELS[block.block_type];
  const isNote = block.block_type === "note";
  const isTimed = isTimedBlock(block.block_type);
  // What a timed block still needs before it can be saved (C4)
  const problem = findTimedBlockProblem(block);
  const count = block.exercises.length;
  const isFull = count >= MAX_EXERCISES_PER_BLOCK;
  // An empty block of exercises: its orange button opens the catalog, and
  // the dashed button would say the same thing twice (handoff 2.2).
  const isEmpty = !isNote && count === 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <PageHeader
        variant="form"
        onBack={onDone}
        backLabel="Retour à la séance"
        overline={`Bloc ${index + 1}`}
        title={typeLabel}
        strongBack
        action={
          <button
            type="button"
            onClick={onRemoveBlock}
            aria-label="Supprimer le bloc"
            className="grid size-9 place-items-center rounded-full bg-back-strong text-muted"
          >
            <Icon src={trashIcon} className="size-4" />
          </button>
        }
      />

      <div className="flex flex-1 flex-col px-[18px] pt-3.5 pb-28">
        <div className="mb-5">
          <TextField
            id="block_name"
            label="Intitulé (facultatif)"
            variant="form"
            value={block.name ?? ""}
            onChange={(event) =>
              onChangeName(
                event.target.value === "" ? null : event.target.value,
              )
            }
            placeholder="Ex. Force"
            autoComplete="off"
            maxLength={160}
          />
        </div>

        {isTimed && (
          <div className="mb-5">
            <TimedBlockSettings
              blockType={block.block_type}
              plannedRounds={block.planned_rounds}
              timeLimitSeconds={block.time_limit_seconds}
              onChangeRounds={onChangeRounds}
              onChangeTimeLimit={onChangeTimeLimit}
            />
          </div>
        )}

        {isNote ? (
          <div className="flex flex-col gap-[9px]">
            <label htmlFor="block_instructions" className={FORM_LABEL}>
              Note
            </label>
            <textarea
              id="block_instructions"
              value={block.instructions ?? ""}
              onChange={(event) =>
                onChangeInstructions(
                  event.target.value === "" ? null : event.target.value,
                )
              }
              maxLength={NOTE_MAX_LENGTH}
              rows={6}
              placeholder="Ex. Penser à bien respirer entre les blocs."
              className="rounded-[12px] border border-base-300 bg-base-100 p-3.5 text-sm font-bold placeholder:font-medium placeholder:text-faint focus:border-accent focus:outline-none"
            />
            <p className="text-[11px] font-semibold text-muted">
              {(block.instructions ?? "").length} / {NOTE_MAX_LENGTH} caractères
            </p>
          </div>
        ) : (
          <section
            aria-labelledby="block-exercises-title"
            className="flex flex-col"
          >
            <div className="mb-[9px] flex items-center justify-between gap-2">
              <h2 id="block-exercises-title" className={FORM_LABEL}>
                Exercices
              </h2>
              {count > 0 && (
                <p className={SECTION_COUNT}>
                  {formatExerciseCountShort(count)}
                </p>
              )}
            </div>

            {isEmpty ? (
              <div className={EMPTY_CARD}>
                <span aria-hidden="true" className={EMPTY_ICON_BOX}>
                  <Icon src={dumbbellLightIcon} className="size-[18px]" />
                </span>
                <p className={EMPTY_TEXT}>
                  Choisis-les dans le catalogue.
                  <br />
                  Chaque exercice aura ses séries.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-2.5">
                  <SortableList
                    label="Exercices du bloc"
                    gapClass="gap-2"
                    // The numbered badge of the handoff is the grip
                    handleClass="grid size-7 shrink-0 cursor-grab touch-none place-items-center rounded-[8px] bg-soft text-xs font-extrabold tabular-nums text-muted"
                    renderHandleContent={(position) => position + 1}
                    handleLabel={(name, position) =>
                      `Déplacer ${name}, exercice ${position + 1}`
                    }
                    items={block.exercises.map((exercise) => ({
                      id: exercise.key,
                      label: exercise.name,
                      content: null,
                    }))}
                    onMove={onMoveExercise}
                    renderRow={(item, handle) => {
                      const exercise = block.exercises.find(
                        (candidate) => candidate.key === item.id,
                      );
                      if (exercise === undefined) {
                        return null;
                      }
                      return (
                        <BlockExerciseRow
                          exercise={exercise}
                          handle={handle}
                          // In a timed block, one objective per round: an
                          // empty one is called out (C4)
                          missingGoal={
                            isTimed && exercise.sets.every(isGoalMissing)
                          }
                          onOpen={() => onOpenExercise(exercise.key)}
                        />
                      );
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={onAddExercises}
                  disabled={isFull}
                  aria-describedby={
                    isFull ? "block-exercises-limit" : undefined
                  }
                  className={DASHED_BUTTON}
                >
                  <Icon src={plusIcon} className="size-[15px]" />
                  Ajouter un exercice
                </button>
                {isFull && (
                  <p
                    id="block-exercises-limit"
                    className="mt-2 text-[11px] font-semibold text-muted"
                  >
                    {MAX_EXERCISES_PER_BLOCK} exercices au maximum par bloc
                  </p>
                )}
              </>
            )}
          </section>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 bg-base-200 px-[18px] pt-3 pb-[18px]">
        <div className="mx-auto flex max-w-md flex-col gap-1.5">
          {problem !== null && (
            <p
              id="timed-block-problem"
              className="text-center text-[11px] font-semibold text-muted"
            >
              {problem}
            </p>
          )}
          <button
            type="button"
            onClick={isEmpty ? onAddExercises : onDone}
            disabled={!isEmpty && problem !== null}
            aria-describedby={
              problem === null ? undefined : "timed-block-problem"
            }
            className={CTA}
          >
            {isEmpty ? "Ajouter des exercices" : "Enregistrer le bloc"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BlockEditor;
