import {
  BLOCK_TYPE_LABELS,
  type DraftBlock,
  formatExerciseCountShort,
} from "shared";
import plusIcon from "../../../assets/icons/ui/actions/plus.svg";
import chevronLeftIcon from "../../../assets/icons/ui/chevrons/chevron-left.svg";
import Icon from "../../../components/Icon";
import TextField from "../../../components/TextField";

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
  // "Enregistrer le bloc" and the back arrow both return to the session
  onDone: () => void;
};

// Screen A4: one block of the draft. Changes apply to the draft as they are
// typed; "Enregistrer le bloc" simply goes back to the session.
function BlockEditor({
  block,
  index,
  sessionName,
  onChangeName,
  onChangeInstructions,
  onRequestTypeChange,
  onDone,
}: Props) {
  const typeLabel = BLOCK_TYPE_LABELS[block.block_type];
  const isNote = block.block_type === "note";
  const canChangeType = block.exercises.length === 0;

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
        <div className="flex min-w-0 flex-col">
          <h1 className="text-display-sm">{typeLabel}</h1>
          <p className="truncate text-sm text-muted">
            Bloc {index + 1} ·{" "}
            {sessionName.trim() === "" ? "Nouvelle séance" : sessionName}
          </p>
        </div>
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
          {canChangeType && (
            <button
              type="button"
              onClick={onRequestTypeChange}
              className="min-h-tap px-2 font-semibold text-secondary"
            >
              Changer
            </button>
          )}
        </div>

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
              <ul className="flex flex-col gap-2">
                {block.exercises.map((exercise) => (
                  <li
                    key={exercise.key}
                    className="rounded-card border border-base-300 bg-base-100 p-4 font-semibold shadow-card"
                  >
                    {exercise.name}
                  </li>
                ))}
              </ul>
            )}
            {/* Wired to the catalog selection by US-14. */}
            <button
              type="button"
              disabled
              aria-describedby="add-exercises-soon"
              className="flex h-12 items-center justify-center gap-2 rounded-btn border border-base-300 bg-base-100 font-semibold disabled:opacity-60"
            >
              <Icon src={plusIcon} className="size-5" />
              Ajouter des exercices
            </button>
            <p id="add-exercises-soon" className="text-sm text-muted">
              Disponible à l'étape suivante.
            </p>
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
