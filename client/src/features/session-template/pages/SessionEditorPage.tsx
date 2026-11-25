import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  useBlocker,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router";
import {
  type BlockType,
  countDraftExercises,
  createEmptyDraft,
  type DraftBlock,
  dateSchema,
  formatBlockCount,
  MAX_BLOCKS,
  sessionDraftSchema,
  todayInParis,
} from "shared";
import plusIcon from "../../../assets/icons/ui/actions/plus.svg";
import chevronLeftIcon from "../../../assets/icons/ui/chevrons/chevron-left.svg";
import ConfirmDialog from "../../../components/ConfirmDialog";
import Icon from "../../../components/Icon";
import TextField from "../../../components/TextField";
import UndoToast from "../../../components/UndoToast";
import BlockEditor from "../components/BlockEditor";
import BlockTypePicker from "../components/BlockTypePicker";
import SessionReview from "../components/SessionReview";
import { nextKey } from "../hooks/sessionDraftReducer";
import { useSessionDraft } from "../hooks/useSessionDraft";

// The date comes from the Planning or the home page (?date=), today otherwise.
function readInitialDate(raw: string | null): string {
  return raw !== null && dateSchema.safeParse(raw).success
    ? raw
    : todayInParis();
}

// Which panel is open: none, "add" a block, or "change" the open block's type.
type PickerMode = "closed" | "add" | "change";

// Screen A2: a new free session. The draft lives in useSessionDraft; leaving
// with unsaved changes asks for a confirmation (back arrow and tab closing).
// A block opens full screen (A4) over the session; the type panel (A3) is a
// dialog.
function SessionEditorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { draft, isDirty, dispatch } = useSessionDraft(
    createEmptyDraft(readInitialDate(searchParams.get("date"))),
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [openBlockKey, setOpenBlockKey] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerMode>("closed");
  // The last removed block, kept 5 seconds for "Annuler".
  const [removed, setRemoved] = useState<{
    block: DraftBlock;
    index: number;
  } | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const blockCount = draft.blocks.length;
  const exerciseCount = countDraftExercises(draft);
  const openBlockIndex = draft.blocks.findIndex(
    (block) => block.key === openBlockKey,
  );
  const openBlock = openBlockIndex === -1 ? null : draft.blocks[openBlockIndex];

  // In-app navigation with unsaved changes: blocked until the user answers.
  const blocker = useBlocker(isDirty);

  // Closing or reloading the tab: the browser shows its own question.
  useEffect(() => {
    if (!isDirty) {
      return;
    }
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty]);

  function goBack() {
    if (location.key === "default") {
      navigate("/");
    } else {
      navigate(-1);
    }
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveNotice(null);
    const result = sessionDraftSchema.safeParse(draft);
    const nameIssue = result.success
      ? undefined
      : result.error.issues.find((issue) => issue.path[0] === "name");
    if (nameIssue !== undefined) {
      setNameError(nameIssue.message);
      nameRef.current?.focus();
      return;
    }
    setNameError(null);
    // Saving (session, version 1, blocks, appointment) is delivered by US-23.
    setSaveNotice("L'enregistrement arrive avec l'étape suivante.");
  }

  function pickBlockType(blockType: BlockType) {
    if (picker === "add") {
      const key = nextKey();
      dispatch({ type: "addBlock", blockType, key });
      setOpenBlockKey(key);
    } else if (picker === "change" && openBlockKey !== null) {
      dispatch({ type: "setBlockType", key: openBlockKey, blockType });
    }
    setPicker("closed");
  }

  function removeBlock(key: string) {
    const index = draft.blocks.findIndex((block) => block.key === key);
    const block = draft.blocks[index];
    if (block === undefined) {
      return;
    }
    dispatch({ type: "removeBlock", key });
    setRemoved({ block, index });
  }

  function undoRemove() {
    if (removed !== null) {
      dispatch({
        type: "restoreBlock",
        block: removed.block,
        index: removed.index,
      });
      setRemoved(null);
    }
  }

  if (openBlock !== null && openBlockKey !== null) {
    return (
      <>
        <BlockEditor
          block={openBlock}
          index={openBlockIndex}
          sessionName={draft.name}
          onChangeName={(name) =>
            dispatch({ type: "setBlockName", key: openBlockKey, name })
          }
          onChangeInstructions={(instructions) =>
            dispatch({
              type: "setBlockInstructions",
              key: openBlockKey,
              instructions,
            })
          }
          onRequestTypeChange={() => setPicker("change")}
          onDone={() => setOpenBlockKey(null)}
        />
        {picker === "change" && (
          <BlockTypePicker
            onPick={pickBlockType}
            onClose={() => setPicker("closed")}
          />
        )}
        {blocker.state === "blocked" && (
          <ConfirmDialog
            title="Quitter sans enregistrer ?"
            message="Ta séance n'est pas encore enregistrée. Si tu quittes, elle sera perdue."
            confirmLabel="Quitter"
            cancelLabel="Continuer la séance"
            onConfirm={() => blocker.proceed()}
            onCancel={() => blocker.reset()}
          />
        )}
      </>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-base-300 bg-base-100 px-2">
        <button
          type="button"
          onClick={goBack}
          aria-label="Retour"
          className="flex size-tap items-center justify-center rounded-btn text-secondary"
        >
          <Icon src={chevronLeftIcon} className="size-7" />
        </button>
        <h1 className="text-display-sm">Nouvelle séance</h1>
        <span className="ml-auto rounded-chip bg-soft px-2 py-0.5 text-overline uppercase text-accent">
          Séance libre
        </span>
      </header>

      <form
        noValidate
        onSubmit={handleSave}
        className="flex flex-1 flex-col gap-6 p-4 pb-28"
      >
        <TextField
          id="planned_date"
          label="Date"
          required
          type="date"
          value={draft.planned_date}
          onChange={(event) =>
            dispatch({ type: "setDate", date: event.target.value })
          }
        />
        <TextField
          id="planned_time"
          label="Heure (facultatif)"
          type="time"
          value={draft.planned_time ?? ""}
          onChange={(event) =>
            dispatch({
              type: "setTime",
              time: event.target.value === "" ? null : event.target.value,
            })
          }
        />
        <TextField
          id="session_name"
          label="Nom de la séance"
          required
          ref={nameRef}
          value={draft.name}
          onChange={(event) => {
            setNameError(null);
            dispatch({ type: "setName", name: event.target.value });
          }}
          placeholder="Ex. Haut du corps"
          autoComplete="off"
          maxLength={160}
          error={nameError ?? undefined}
        />

        <section aria-labelledby="blocks-title" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2
              id="blocks-title"
              className="font-sans text-overline not-italic uppercase text-accent"
            >
              Blocs
            </h2>
            <p className="text-sm font-semibold text-muted">
              {formatBlockCount(blockCount)}
            </p>
          </div>

          {blockCount === 0 ? (
            <p className="rounded-card border border-base-300 bg-base-100 p-4 text-muted shadow-card">
              Ajoute un premier bloc pour y mettre des exercices.
            </p>
          ) : (
            <SessionReview
              blocks={draft.blocks}
              onOpen={setOpenBlockKey}
              onRemove={removeBlock}
            />
          )}

          <button
            type="button"
            onClick={() => setPicker("add")}
            disabled={blockCount >= MAX_BLOCKS}
            aria-describedby={
              blockCount >= MAX_BLOCKS ? "blocks-limit" : undefined
            }
            className="flex h-12 items-center justify-center gap-2 rounded-btn border border-base-300 bg-base-100 font-semibold disabled:opacity-60"
          >
            <Icon src={plusIcon} className="size-5" />
            Ajouter un bloc
          </button>
          {blockCount >= MAX_BLOCKS && (
            <p id="blocks-limit" className="text-sm text-muted">
              {MAX_BLOCKS} blocs au maximum
            </p>
          )}
        </section>

        {exerciseCount === 0 && (
          <p
            role="status"
            className="flex gap-2 rounded-card border border-status-pending bg-base-100 p-3 text-sm font-semibold"
          >
            <span aria-hidden="true" className="text-status-pending">
              ⚠
            </span>
            Cette séance n'a pas encore d'exercice : tu ne pourras pas la
            démarrer.
          </p>
        )}

        {saveNotice !== null && (
          <p role="status" className="text-center font-semibold text-muted">
            {saveNotice}
          </p>
        )}

        <div className="fixed inset-x-0 bottom-0 border-t border-base-300 bg-base-100 p-4">
          <div className="mx-auto max-w-md">
            <button
              type="submit"
              className="flex h-btn w-full items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action"
            >
              Enregistrer la séance
            </button>
          </div>
        </div>
      </form>

      {picker === "add" && (
        <BlockTypePicker
          onPick={pickBlockType}
          onClose={() => setPicker("closed")}
        />
      )}

      {removed !== null && (
        <UndoToast
          message="Bloc retiré"
          onUndo={undoRemove}
          onDismiss={() => setRemoved(null)}
        />
      )}

      {blocker.state === "blocked" && (
        <ConfirmDialog
          title="Quitter sans enregistrer ?"
          message="Ta séance n'est pas encore enregistrée. Si tu quittes, elle sera perdue."
          confirmLabel="Quitter"
          cancelLabel="Continuer la séance"
          onConfirm={() => blocker.proceed()}
          onCancel={() => blocker.reset()}
        />
      )}
    </div>
  );
}

export default SessionEditorPage;
