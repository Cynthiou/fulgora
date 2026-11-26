import {
  BLOCK_TYPE_LABELS,
  type DraftBlock,
  findTimedBlockProblem,
  formatExerciseCountShort,
  isGoalMissing,
  isTimedBlock,
  MAX_EXERCISES_PER_BLOCK,
} from "shared";
import checkIcon from "../../../assets/icons/ui/app/check.svg";
import plusIcon from "../../../assets/icons/ui/app/plus.svg";
import trashIcon from "../../../assets/icons/ui/app/trash.svg";
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
  sessionName: string;
  onChangeName: (name: string | null) => void;
  onChangeInstructions: (instructions: string | null) => void;
  // The settings of a timed block (US-43)
  onChangeRounds: (rounds: number | null) => void;
  onChangeTimeLimit: (seconds: number | null) => void;
  // "Changer": reopens the type panel; only offered on an empty block (D-03)
  onRequestTypeChange: () => void;
  // "Ajouter des exercices": opens the catalog in selection mode (A5)
  onAddExercises: () => void;
  onOpenExercise: (exerciseKey: string) => void;
  onRemoveExercise: (exerciseKey: string) => void;
  // The order of the exercises of the block (US-16)
  onMoveExercise: (from: number, to: number) => void;
  // "Enregistrer le bloc" and the back arrow both return to the session
  onDone: () => void;
  // The trash can of the header (A4): removes the whole block
  onRemoveBlock: () => void;
};

// Screens A4 and A6: one block of the draft. Changes apply to the draft as
// they are typed; "Enregistrer le bloc" simply goes back to the session.
function BlockEditor({
  block,
  index,
  sessionName,
  onChangeName,
  onChangeInstructions,
  onChangeRounds,
  onChangeTimeLimit,
  onRequestTypeChange,
  onAddExercises,
  onOpenExercise,
  onRemoveExercise,
  onMoveExercise,
  onDone,
  onRemoveBlock,
}: Props) {
  const typeLabel = BLOCK_TYPE_LABELS[block.block_type];
  const isNote = block.block_type === "note";
  const isTimed = isTimedBlock(block.block_type);
  // What a timed block still needs before it can be saved (C4)
  const problem = findTimedBlockProblem(block);
  const canChangeType = block.exercises.length === 0;
  const isFull = block.exercises.length >= MAX_EXERCISES_PER_BLOCK;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <PageHeader
        onBack={problem === null ? onDone : undefined}
        backLabel="Retour à la séance"
        title={typeLabel}
        subtitle={`Bloc ${index + 1} · ${
          sessionName.trim() === "" ? "Nouvelle séance" : sessionName
        }`}
        action={
          <button
            type="button"
            onClick={onRemoveBlock}
            aria-label="Retirer le bloc"
            className="grid size-tap shrink-0 place-items-center rounded-btn text-status-missed"
          >
            <Icon src={trashIcon} className="size-5" />
          </button>
        }
      />

      <div className="flex flex-1 flex-col gap-3 px-[18px] pt-1 pb-28">
        <TextField
          id="block_name"
          label="Intitulé (facultatif)"
          value={block.name ?? ""}
          onChange={(event) =>
            onChangeName(event.target.value === "" ? null : event.target.value)
          }
          placeholder="Ex. Force"
          autoComplete="off"
          maxLength={160}
        />

        <div className="flex items-center justify-between gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card">
          <div className="flex flex-col">
            <span className="font-sans text-overline uppercase not-italic text-accent">
              Type de bloc
            </span>
            <span className="text-sm font-bold">{typeLabel}</span>
          </div>
          <button
            type="button"
            onClick={onRequestTypeChange}
            disabled={!canChangeType}
            aria-describedby={canChangeType ? undefined : "change-type-soon"}
            className="min-h-tap px-2 font-semibold text-secondary disabled:opacity-60"
          >
            Changer
          </button>
        </div>

        {!canChangeType && (
          <p id="change-type-soon" className="-mt-1 text-xs text-muted">
            Changer le type d'un bloc qui a des exercices arrive bientôt.
          </p>
        )}

        {isTimed && (
          <TimedBlockSettings
            blockType={block.block_type}
            plannedRounds={block.planned_rounds}
            timeLimitSeconds={block.time_limit_seconds}
            onChangeRounds={onChangeRounds}
            onChangeTimeLimit={onChangeTimeLimit}
          />
        )}

        {isNote ? (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="block_instructions"
              className="font-sans text-overline uppercase not-italic text-accent"
            >
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
              className="rounded-btn border border-base-300 bg-base-100 p-4 text-[15px] shadow-card placeholder:text-faint"
            />
            <p className="text-sm text-muted">
              {(block.instructions ?? "").length} / {NOTE_MAX_LENGTH} caractères
            </p>
          </div>
        ) : (
          <section
            aria-labelledby="block-exercises-title"
            className="flex flex-col gap-3"
          >
            <div className="flex items-baseline justify-between">
              <h2 id="block-exercises-title" className="text-display-xs">
                Exercices
              </h2>
              <p className="text-xs font-semibold leading-[1.45] text-muted">
                {formatExerciseCountShort(block.exercises.length)}
              </p>
            </div>
            {block.exercises.length === 0 ? (
              <p className="rounded-card border border-base-300 bg-base-100 p-4 text-sm leading-[1.45] text-muted shadow-card">
                Choisis tes exercices dans le catalogue.
              </p>
            ) : (
              <div className="overflow-hidden rounded-card border border-base-300 bg-base-100 shadow-card">
                <SortableList
                  label="Exercices du bloc"
                  gapClass="gap-0"
                  items={block.exercises.map((exercise) => ({
                    id: exercise.key,
                    label: exercise.name,
                    content: null,
                  }))}
                  onMove={onMoveExercise}
                  renderRow={(item, handle) => {
                    const position = block.exercises.findIndex(
                      (exercise) => exercise.key === item.id,
                    );
                    const exercise = block.exercises[position];
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
                        isFirst={position === 0}
                        onOpen={() => onOpenExercise(exercise.key)}
                        onRemove={() => onRemoveExercise(exercise.key)}
                        onMoveUp={
                          position === 0
                            ? null
                            : () => onMoveExercise(position, position - 1)
                        }
                        onMoveDown={
                          position === block.exercises.length - 1
                            ? null
                            : () => onMoveExercise(position, position + 1)
                        }
                      />
                    );
                  }}
                />
              </div>
            )}
            <button
              type="button"
              onClick={onAddExercises}
              disabled={isFull}
              aria-describedby={isFull ? "block-exercises-limit" : undefined}
              className="flex h-13 items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-dash text-sm font-bold text-secondary disabled:opacity-60"
            >
              <Icon src={plusIcon} className="size-[18px]" />
              Ajouter des exercices
            </button>
            {isFull && (
              <p id="block-exercises-limit" className="text-xs text-muted">
                {MAX_EXERCISES_PER_BLOCK} exercices au maximum par bloc
              </p>
            )}
          </section>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 px-[18px] pt-3 pb-1">
        <div className="mx-auto flex max-w-md flex-col gap-1.5">
          {problem !== null && (
            <p
              id="timed-block-problem"
              className="text-center text-xs font-semibold text-muted"
            >
              {problem}
            </p>
          )}
          <button
            type="button"
            onClick={onDone}
            disabled={problem !== null}
            aria-describedby={
              problem === null ? undefined : "timed-block-problem"
            }
            className="flex h-btn w-full items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60"
          >
            <Icon src={checkIcon} className="size-[18px]" />
            Enregistrer le bloc
          </button>
        </div>
      </div>
    </div>
  );
}

export default BlockEditor;
