import {
  BLOCK_TYPE_LABELS,
  type DraftBlock,
  formatExerciseCountShort,
  MAX_EXERCISES_PER_BLOCK,
} from "shared";
import plusIcon from "../../../assets/icons/ui/actions/plus.svg";
import trashIcon from "../../../assets/icons/ui/actions/trash.svg";
import chevronLeftIcon from "../../../assets/icons/ui/chevrons/chevron-left.svg";
import Icon from "../../../components/Icon";
import TextField from "../../../components/TextField";
import BlockExerciseRow from "./BlockExerciseRow";

const NOTE_MAX_LENGTH = 2000;

type Props = {
  block: DraftBlock;
  // Position in the session, from 0 ("Bloc 1")
  index: number;
  sessionName: string;
  onChangeName: (name: string | null) => void;
  onChangeInstructions: (instructions: string | null) => void;
  // "Changer": reopens the type panel; only offered on an empty block (D-03)
  onRequestTypeChange: () => void;
  // "Ajouter des exercices": opens the catalog in selection mode (A5)
  onAddExercises: () => void;
  onOpenExercise: (exerciseKey: string) => void;
  onRemoveExercise: (exerciseKey: string) => void;
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
  onRequestTypeChange,
  onAddExercises,
  onOpenExercise,
  onRemoveExercise,
  onDone,
  onRemoveBlock,
}: Props) {
  const typeLabel = BLOCK_TYPE_LABELS[block.block_type];
  const isNote = block.block_type === "note";
  const canChangeType = block.exercises.length === 0;
  const isFull = block.exercises.length >= MAX_EXERCISES_PER_BLOCK;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-base-300 bg-base-100 px-2">
        <button
          type="button"
          onClick={onDone}
          aria-label="Retour à la séance"
          className="flex size-tap items-center justify-center rounded-btn text-secondary"
        >
          <Icon src={chevronLeftIcon} className="size-7" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="text-display-sm">{typeLabel}</h1>
          <p className="truncate text-sm text-muted">
            Bloc {index + 1} ·{" "}
            {sessionName.trim() === "" ? "Nouvelle séance" : sessionName}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemoveBlock}
          aria-label="Retirer le bloc"
          className="flex size-tap shrink-0 items-center justify-center rounded-btn text-secondary"
        >
          <Icon src={trashIcon} className="size-6" />
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-4 pb-28">
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
            <span className="text-overline uppercase text-accent">
              Type de bloc
            </span>
            <span className="font-semibold">{typeLabel}</span>
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
          <p id="change-type-soon" className="-mt-4 text-sm text-muted">
            Changer le type d'un bloc qui a des exercices arrive bientôt.
          </p>
        )}

        {isNote ? (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="block_instructions"
              className="text-overline uppercase text-accent"
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
              className="rounded-btn border border-base-300 bg-base-100 p-4"
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
              <h2
                id="block-exercises-title"
                className="font-sans text-overline not-italic uppercase text-accent"
              >
                Exercices
              </h2>
              <p className="text-sm font-semibold text-muted">
                {formatExerciseCountShort(block.exercises.length)}
              </p>
            </div>
            {block.exercises.length === 0 ? (
              <p className="rounded-card border border-base-300 bg-base-100 p-4 text-muted shadow-card">
                Choisis tes exercices dans le catalogue.
              </p>
            ) : (
              <ul
                aria-label="Exercices du bloc"
                className="flex flex-col gap-2"
              >
                {block.exercises.map((exercise) => (
                  <BlockExerciseRow
                    key={exercise.key}
                    exercise={exercise}
                    onOpen={() => onOpenExercise(exercise.key)}
                    onRemove={() => onRemoveExercise(exercise.key)}
                  />
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={onAddExercises}
              disabled={isFull}
              aria-describedby={isFull ? "block-exercises-limit" : undefined}
              className="flex h-12 items-center justify-center gap-2 rounded-btn border border-base-300 bg-base-100 font-semibold disabled:opacity-60"
            >
              <Icon src={plusIcon} className="size-5" />
              Ajouter des exercices
            </button>
            {isFull && (
              <p id="block-exercises-limit" className="text-sm text-muted">
                {MAX_EXERCISES_PER_BLOCK} exercices au maximum par bloc
              </p>
            )}
          </section>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-base-300 bg-base-100 p-4">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={onDone}
            className="flex h-btn w-full items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action"
          >
            Enregistrer le bloc
          </button>
        </div>
      </div>
    </div>
  );
}

export default BlockEditor;
