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
  type DraftExercise,
  dateSchema,
  diffSessionDrafts,
  formatBlockCount,
  formatLongDate,
  MAX_BLOCKS,
  type SelectedExercise,
  type SessionDraft,
  sessionDraftSchema,
  todayInParis,
} from "shared";
import blockIcon from "../../../assets/icons/ui/app/block.svg";
import calendarIcon from "../../../assets/icons/ui/app/calendar.svg";
import plusIcon from "../../../assets/icons/ui/app/plus.svg";
import ConfirmDialog from "../../../components/ConfirmDialog";
import Icon from "../../../components/Icon";
import PageHeader from "../../../components/PageHeader";
import TextField from "../../../components/TextField";
import UndoToast from "../../../components/UndoToast";
import { ApiError } from "../../../services/apiError";
import { createFreeSession } from "../../appointment/services/appointmentService";
import BlockEditor from "../components/BlockEditor";
import BlockTypePicker from "../components/BlockTypePicker";
import DatePickerSheet from "../components/DatePickerSheet";
import SessionChangesPanel from "../components/SessionChangesPanel";
import SessionReview from "../components/SessionReview";
import SessionSavedPanel from "../components/SessionSavedPanel";
import SetConfigurator from "../components/SetConfigurator";
import { nextKey, sessionDraftReducer } from "../hooks/sessionDraftReducer";
import { useSessionDraft } from "../hooks/useSessionDraft";
import {
  clearDraft,
  clearPendingExercises,
  loadDraft,
  readPendingExercises,
  saveDraft,
} from "../services/sessionDraftStorage";

// The catalog in selection mode for a block (A5); leaving for it is not
// leaving the editor.
export const SELECTION_PATH = "/seances/nouvelle/exercices";

// The date comes from the Planning or the home page (?date=), today otherwise.
function readInitialDate(raw: string | null): string {
  return raw !== null && dateSchema.safeParse(raw).success
    ? raw
    : todayInParis();
}

// Exercises handed over by the catalog ("Ajouter à une séance").
type NavigationState = { exercises?: SelectedExercise[] } | null;

// What the editor needs to change a session already saved: the one of an
// appointment (US-17) or the one of a day of a program (US-18).
export type EditContext = {
  // The address of this editor, which keys the draft kept during a detour
  path: string;
  // Shown under the title: the program, or the name of the session
  subtitle: string | null;
  // The saved version: the editor opens on it, and the list of changes
  // (CAL-06b) compares against it
  savedDraft: SessionDraft;
  // "Jeudi" for a day of a program: it replaces the date, which belongs to
  // the appointment and changes through "Déplacer" (US-25)
  dayLabel?: string | null;
  // Writes the new version, then says where to go
  save: (draft: SessionDraft) => Promise<void>;
  onSaved: () => void;
};

type InitialState = {
  draft: SessionDraft;
  openBlockKey: string | null;
  isDirty: boolean;
};

// Where the editor starts: with exercises from the catalog (a fresh draft and
// a Classic block), or the draft kept during a detour (plus the exercises
// chosen for a block), or an empty draft.
function readInitialState(
  state: NavigationState,
  dateParam: string | null,
  edit: EditContext | undefined,
): InitialState {
  // Changing a saved session: the draft of the detour is taken back only
  // when it belongs to this very appointment.
  if (edit !== undefined) {
    const stored = loadDraft();
    if (stored === null || stored.editorPath !== edit.path) {
      return { draft: edit.savedDraft, openBlockKey: null, isDirty: false };
    }
    const pending = readPendingExercises();
    const draft =
      pending === null
        ? stored.draft
        : sessionDraftReducer(stored.draft, {
            type: "addExercises",
            blockKey: pending.blockKey,
            exercises: pending.exercises,
          });
    return { draft, openBlockKey: stored.openBlockKey, isDirty: true };
  }

  if (state?.exercises !== undefined && state.exercises.length > 0) {
    const key = nextKey();
    const withBlock = sessionDraftReducer(
      createEmptyDraft(readInitialDate(dateParam)),
      { type: "addBlock", blockType: "classic", key },
    );
    const draft = sessionDraftReducer(withBlock, {
      type: "addExercises",
      blockKey: key,
      exercises: state.exercises,
    });
    return { draft, openBlockKey: null, isDirty: true };
  }

  const stored = loadDraft();
  if (stored !== null && (stored.editorPath ?? null) === null) {
    const pending = readPendingExercises();
    const draft =
      pending === null
        ? stored.draft
        : sessionDraftReducer(stored.draft, {
            type: "addExercises",
            blockKey: pending.blockKey,
            exercises: pending.exercises,
          });
    return { draft, openBlockKey: stored.openBlockKey, isDirty: true };
  }

  return {
    draft: createEmptyDraft(readInitialDate(dateParam)),
    openBlockKey: null,
    isDirty: false,
  };
}

// Which panel is open: none, "add" a block, or "change" the open block's type.
type PickerMode = "closed" | "add" | "change";

// The last removal, kept 5 seconds for "Annuler".
type Removed =
  | { kind: "block"; block: DraftBlock; index: number }
  | {
      kind: "exercise";
      blockKey: string;
      exercise: DraftExercise;
      index: number;
    };

// What the confirmation screen (A9) shows once the session is saved.
type SavedSession = {
  name: string;
  plannedDate: string;
  plannedTime: string | null;
  blockCount: number;
  exerciseCount: number;
};

// The exercise named by a server error path such as "blocks.2.exercises.0".
function findExerciseByPath(
  draft: SessionDraft,
  path: string | undefined,
): DraftExercise | null {
  const match = /^blocks\.(\d+)\.exercises\.(\d+)/.exec(path ?? "");
  if (match === null) {
    return null;
  }
  return draft.blocks[Number(match[1])]?.exercises[Number(match[2])] ?? null;
}

// The message shown when the server refuses the session.
function toSaveError(error: unknown, draft: SessionDraft): string {
  if (error instanceof ApiError) {
    const exercise = findExerciseByPath(draft, error.field);
    if (error.code === "EXERCISE_NOT_AVAILABLE") {
      return exercise === null
        ? "Un exercice n'est plus disponible. Retire-le pour enregistrer."
        : `« ${exercise.name} » n'est plus disponible. Retire-le pour enregistrer.`;
    }
    if (error.code === "MEASURE_NOT_ALLOWED" && exercise !== null) {
      return `« ${exercise.name} » : ${error.message}`;
    }
    if (error.status === 400) {
      return "Certaines valeurs de la séance sont invalides. Vérifie les blocs et les séries.";
    }
  }
  return "Impossible d'enregistrer la séance. Ton brouillon est conservé.";
}

type Props = {
  // Given by EditSessionPage: the editor then changes a planned session
  // instead of creating one (US-17).
  edit?: EditContext;
};

// Screen A2: a new free session. The draft lives in useSessionDraft; leaving
// with unsaved changes asks for a confirmation (back arrow and tab closing).
// A block opens full screen (A4/A6) over the session; the type panel (A3) is
// a dialog. With an edit context, the same screens change a planned session
// and the save goes through the list of changes (CAL-06b).
function SessionEditorPage({ edit }: Props) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initial = useRef<InitialState | null>(null);
  if (initial.current === null) {
    initial.current = readInitialState(
      location.state as NavigationState,
      searchParams.get("date"),
      edit,
    );
  }
  const { draft, isDirty, dispatch, markSaved } = useSessionDraft(
    initial.current.draft,
    initial.current.isDirty,
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [isPickingDate, setIsPickingDate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedSession | null>(null);
  // Edit mode: the changes are shown before being written (CAL-06b)
  const [isReviewing, setIsReviewing] = useState(false);
  // Read in the same instant a second tap arrives: one session, never two.
  const inFlight = useRef(false);
  // Set just before leaving for the saved session: the exit question must
  // not pop up on a change that has just been written.
  const hasSaved = useRef(false);
  const [openBlockKey, setOpenBlockKey] = useState<string | null>(
    initial.current.openBlockKey,
  );
  const [picker, setPicker] = useState<PickerMode>("closed");
  // The exercise whose sets are being configured (A7), inside the open block
  const [openExerciseKey, setOpenExerciseKey] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Removed | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // What was handed over has been taken: a reload must not add it twice.
  useEffect(() => {
    clearPendingExercises();
    const state = location.state as NavigationState;
    if (state?.exercises !== undefined) {
      navigate(`${location.pathname}${location.search}`, {
        replace: true,
        state: null,
      });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  // A changed draft is kept in the tab, for the detour through the catalog.
  useEffect(() => {
    if (isDirty) {
      saveDraft({ draft, openBlockKey, editorPath: edit?.path ?? null });
    }
  }, [draft, openBlockKey, isDirty, edit]);

  const blockCount = draft.blocks.length;
  const exerciseCount = countDraftExercises(draft);
  const openBlockIndex = draft.blocks.findIndex(
    (block) => block.key === openBlockKey,
  );
  const openBlock = openBlockIndex === -1 ? null : draft.blocks[openBlockIndex];
  const openExercise =
    openBlock?.exercises.find((exercise) => exercise.key === openExerciseKey) ??
    null;

  // In-app navigation with unsaved changes: blocked until the user answers,
  // except towards the catalog selection, which comes back here.
  const blocker = useBlocker(
    ({ nextLocation }) =>
      isDirty && !hasSaved.current && nextLocation.pathname !== SELECTION_PATH,
  );

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

  // "Quitter": the draft is dropped for good.
  function leave() {
    clearDraft();
    if (blocker.state === "blocked") {
      blocker.proceed();
    }
  }

  // Saves everything in one call: session, version 1, blocks, exercises,
  // sets and the appointment. On failure the draft stays as it is.
  async function save() {
    if (inFlight.current) {
      return;
    }
    setSaveError(null);
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

    inFlight.current = true;
    setIsSaving(true);
    try {
      await createFreeSession(draft);
      markSaved();
      clearDraft();
      setSaved({
        name: draft.name,
        plannedDate: draft.planned_date,
        plannedTime: draft.planned_time,
        blockCount: draft.blocks.length,
        exerciseCount: countDraftExercises(draft),
      });
    } catch (error) {
      setSaveError(toSaveError(error, draft));
    } finally {
      inFlight.current = false;
      setIsSaving(false);
    }
  }

  // Edit mode: what the change does, line by line (CAL-06b).
  const changes =
    edit === undefined ? [] : diffSessionDrafts(edit.savedDraft, draft);

  // Checks the name, then shows the changes instead of saving right away.
  function review() {
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
    setSaveError(null);
    setIsReviewing(true);
  }

  // "Valider" of CAL-06b: the change becomes a new version (RM-017).
  async function confirmEdit() {
    if (edit === undefined || inFlight.current) {
      return;
    }
    inFlight.current = true;
    setIsSaving(true);
    setSaveError(null);
    try {
      await edit.save(draft);
      hasSaved.current = true;
      markSaved();
      clearDraft();
      edit.onSaved();
    } catch (error) {
      setSaveError(toSaveError(error, draft));
    } finally {
      inFlight.current = false;
      setIsSaving(false);
    }
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (edit === undefined) {
      save();
    } else {
      review();
    }
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
    setRemoved({ kind: "block", block, index });
  }

  function removeExercise(blockKey: string, exerciseKey: string) {
    const block = draft.blocks.find((candidate) => candidate.key === blockKey);
    const index =
      block?.exercises.findIndex((exercise) => exercise.key === exerciseKey) ??
      -1;
    const exercise = block?.exercises[index];
    if (exercise === undefined) {
      return;
    }
    dispatch({ type: "removeExercise", blockKey, exerciseKey });
    setRemoved({ kind: "exercise", blockKey, exercise, index });
  }

  function undoRemove() {
    if (removed === null) {
      return;
    }
    if (removed.kind === "block") {
      dispatch({
        type: "restoreBlock",
        block: removed.block,
        index: removed.index,
      });
    } else {
      dispatch({
        type: "restoreExercise",
        blockKey: removed.blockKey,
        exercise: removed.exercise,
        index: removed.index,
      });
    }
    setRemoved(null);
  }

  // The catalog in selection mode; the draft is saved in the tab first.
  function addExercises(blockKey: string) {
    saveDraft({
      draft,
      openBlockKey: blockKey,
      editorPath: edit?.path ?? null,
    });
    navigate(`${SELECTION_PATH}?block=${encodeURIComponent(blockKey)}`);
  }

  const exitDialog = blocker.state === "blocked" && (
    <ConfirmDialog
      title="Quitter sans enregistrer ?"
      message={
        edit === undefined
          ? "Ta séance n'est pas encore enregistrée. Si tu quittes, elle sera perdue."
          : "Tes changements ne sont pas enregistrés. Si tu quittes, ils seront perdus."
      }
      confirmLabel="Quitter"
      cancelLabel="Continuer la séance"
      onConfirm={leave}
      onCancel={() => blocker.reset()}
    />
  );

  const undoToast = removed !== null && (
    <UndoToast
      message={removed.kind === "block" ? "Bloc retiré" : "Exercice retiré"}
      onUndo={undoRemove}
      onDismiss={() => setRemoved(null)}
    />
  );

  if (saved !== null) {
    return <SessionSavedPanel {...saved} />;
  }

  if (isReviewing && edit !== undefined) {
    return (
      <>
        <SessionChangesPanel
          sessionName={draft.name}
          programName={edit.subtitle}
          plannedDate={draft.planned_date}
          changes={changes}
          isSaving={isSaving}
          error={saveError}
          onConfirm={confirmEdit}
          onBack={() => setIsReviewing(false)}
        />
        {exitDialog}
      </>
    );
  }

  if (
    openBlock !== undefined &&
    openBlock !== null &&
    openBlockKey !== null &&
    openExercise !== null &&
    openExerciseKey !== null
  ) {
    const target = { blockKey: openBlockKey, exerciseKey: openExerciseKey };
    return (
      <>
        <SetConfigurator
          exercise={openExercise}
          onUpdateSet={(index, values) =>
            dispatch({ type: "updateSet", ...target, index, values })
          }
          onAddSet={() => dispatch({ type: "addSet", ...target })}
          onDuplicateLastSet={() =>
            dispatch({ type: "duplicateLastSet", ...target })
          }
          onRemoveSet={(index) =>
            dispatch({ type: "removeSet", ...target, index })
          }
          onChangeRest={(seconds) =>
            dispatch({ type: "updateExerciseRest", ...target, seconds })
          }
          onDone={() => setOpenExerciseKey(null)}
          onRemove={() => {
            setOpenExerciseKey(null);
            removeExercise(openBlockKey, openExerciseKey);
          }}
        />
        {exitDialog}
      </>
    );
  }

  if (openBlock !== undefined && openBlock !== null && openBlockKey !== null) {
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
          onAddExercises={() => addExercises(openBlockKey)}
          onOpenExercise={setOpenExerciseKey}
          onRemoveExercise={(exerciseKey) =>
            removeExercise(openBlockKey, exerciseKey)
          }
          onDone={() => setOpenBlockKey(null)}
          onRemoveBlock={() => {
            setOpenBlockKey(null);
            removeBlock(openBlockKey);
          }}
        />
        {picker === "change" && (
          <BlockTypePicker
            onPick={pickBlockType}
            onClose={() => setPicker("closed")}
          />
        )}
        {undoToast}
        {exitDialog}
      </>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <PageHeader
        onBack={goBack}
        title={edit === undefined ? "Nouvelle séance" : "Modifier la séance"}
        subtitle={
          edit === undefined ? "Séance libre" : (edit.subtitle ?? draft.name)
        }
      />

      <form
        noValidate
        onSubmit={handleSave}
        className="flex flex-1 flex-col px-[18px] pt-1 pb-28"
      >
        {/* While saving, nothing can change anymore: one fieldset freezes all. */}
        <fieldset disabled={isSaving} className="flex flex-col gap-3.5">
          {edit === undefined ? (
            <div className="grid grid-cols-[1.5fr_1fr] gap-2.5">
              <div className="flex flex-col gap-1.5">
                <span className="font-sans text-overline uppercase not-italic text-accent">
                  Date *
                </span>
                <button
                  type="button"
                  onClick={() => setIsPickingDate(true)}
                  aria-haspopup="dialog"
                  aria-label={`Date : ${formatLongDate(
                    draft.planned_date,
                  )}, choisir une autre date`}
                  className="flex h-field items-center gap-2.5 rounded-btn border border-base-300 bg-base-100 px-4 text-left shadow-card"
                >
                  <Icon
                    src={calendarIcon}
                    className="size-[18px] shrink-0 text-muted"
                  />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                    {formatLongDate(draft.planned_date)}
                  </span>
                </button>
              </div>
              <TextField
                id="planned_time"
                label="Heure"
                type="time"
                value={draft.planned_time ?? ""}
                onChange={(event) =>
                  dispatch({
                    type: "setTime",
                    time: event.target.value === "" ? null : event.target.value,
                  })
                }
              />
            </div>
          ) : (
            // The date and the time belong to the appointment: they change
            // through "Déplacer" (US-25), never here. A day of a program
            // shows its weekday instead (PRO-03).
            <div className="flex flex-col gap-1">
              <p className="flex h-field items-center rounded-btn border border-base-300 bg-soft px-4 shadow-card">
                <span className="flex flex-col">
                  <span className="text-overline uppercase text-accent">
                    {edit.dayLabel === undefined || edit.dayLabel === null
                      ? "Date"
                      : "Jour"}
                  </span>
                  <span className="font-semibold">
                    {edit.dayLabel === undefined || edit.dayLabel === null
                      ? `${formatLongDate(draft.planned_date)}${
                          draft.planned_time === null
                            ? ""
                            : ` · ${draft.planned_time}`
                        }`
                      : edit.dayLabel}
                  </span>
                </span>
              </p>
              <p className="text-sm text-muted">
                {edit.dayLabel === undefined || edit.dayLabel === null
                  ? "Pour changer la date ou l'heure : « Déplacer »."
                  : "Ce jour vient du programme."}
              </p>
            </div>
          )}
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

          <section
            aria-labelledby="blocks-title"
            className="flex flex-col gap-3"
          >
            <div className="flex items-baseline justify-between">
              <h2 id="blocks-title" className="text-display-xs">
                Blocs
              </h2>
              <p className="text-xs font-semibold leading-[1.45] text-muted">
                {formatBlockCount(blockCount)}
              </p>
            </div>

            {blockCount === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-card border border-base-300 bg-base-100 p-4 py-6 text-center shadow-card">
                <span
                  aria-hidden="true"
                  className="grid size-12 place-items-center rounded-hero bg-secondary/[0.08] text-secondary"
                >
                  <Icon src={blockIcon} className="size-6" />
                </span>
                <p className="text-sm leading-[1.45] text-muted">
                  Ajoute un premier bloc pour y mettre des exercices.
                </p>
              </div>
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
              className="flex h-13 items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-dash text-sm font-bold text-secondary disabled:opacity-60"
            >
              <Icon src={plusIcon} className="size-[18px]" />
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

          {saveError !== null && (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-card border border-status-missed bg-base-100 p-4"
            >
              <p className="font-semibold">{saveError}</p>
              <button
                type="button"
                onClick={save}
                className="h-12 rounded-btn border border-base-300 bg-base-100 font-semibold"
              >
                Réessayer
              </button>
            </div>
          )}

          <div className="fixed inset-x-0 bottom-0 px-[18px] pt-3 pb-1">
            <div className="mx-auto max-w-md">
              <button
                type="submit"
                disabled={
                  isSaving || (edit !== undefined && changes.length === 0)
                }
                aria-describedby={
                  edit !== undefined && changes.length === 0
                    ? "no-change"
                    : undefined
                }
                className="flex h-btn w-full items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60"
              >
                {edit !== undefined
                  ? "Vérifier les changements"
                  : isSaving
                    ? "Enregistrement…"
                    : "Enregistrer la séance"}
              </button>
              {edit !== undefined && changes.length === 0 && (
                <p
                  id="no-change"
                  className="mt-2 text-center text-sm text-muted"
                >
                  Rien n'a changé pour l'instant.
                </p>
              )}
            </div>
          </div>
        </fieldset>
      </form>

      {isPickingDate && (
        <DatePickerSheet
          value={draft.planned_date}
          onConfirm={(date) => {
            dispatch({ type: "setDate", date });
            setIsPickingDate(false);
          }}
          onClose={() => setIsPickingDate(false)}
        />
      )}

      {picker === "add" && (
        <BlockTypePicker
          onPick={pickBlockType}
          onClose={() => setPicker("closed")}
        />
      )}

      {undoToast}
      {exitDialog}
    </div>
  );
}

export default SessionEditorPage;
