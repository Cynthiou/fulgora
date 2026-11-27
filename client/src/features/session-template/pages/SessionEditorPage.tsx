import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  useBlocker,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router";
import {
  BLOCK_TYPE_LABELS,
  type BlockType,
  countDraftExercises,
  createEmptyDraft,
  type DraftBlock,
  type DraftExercise,
  dateSchema,
  diffSessionDrafts,
  findTimedBlockProblem,
  formatBlockCount,
  formatShortDayMonth,
  getBlockLabel,
  isTimedBlock,
  MAX_BLOCKS,
  type SelectedExercise,
  type SessionDraft,
  sessionDraftSchema,
  todayInParis,
} from "shared";
import calendarIcon from "../../../assets/icons/ui/v3/calendar.svg";
import clockIcon from "../../../assets/icons/ui/v3/clock.svg";
import layersIcon from "../../../assets/icons/ui/v3/layers.svg";
import plusIcon from "../../../assets/icons/ui/v3/plus.svg";
import ConfirmDialog from "../../../components/ConfirmDialog";
import {
  CTA,
  DASHED_BUTTON,
  EMPTY_CARD,
  EMPTY_ICON_BOX,
  EMPTY_TEXT,
  FORM_BOX,
  FORM_LABEL,
  SECTION_COUNT,
  SECTION_TITLE,
} from "../../../components/formClasses";
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
import SetsEditor from "../components/SetsEditor";
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
  // True while the "Type de bloc" panel is open (handoff 2.1)
  const [isPickingType, setIsPickingType] = useState(false);
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
  // The first block that is not ready yet ("Règle le nombre de tours.").
  function findBlockProblem(): string | null {
    for (const [index, block] of draft.blocks.entries()) {
      const problem = findTimedBlockProblem(block);
      if (problem !== null) {
        return `${getBlockLabel(block, index)} : ${problem.toLowerCase()}`;
      }
    }
    return null;
  }

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

    // A timed block without its settings would be refused by the server
    // (US-43): say it here, next to the blocks.
    const blockProblem = findBlockProblem();
    if (blockProblem !== null) {
      setSaveError(blockProblem);
      return;
    }

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
    const blockProblem = findBlockProblem();
    if (blockProblem !== null) {
      setSaveError(blockProblem);
      return;
    }
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

  // The chosen type creates the block and opens it right away (2.1 -> 2.2).
  function pickBlockType(blockType: BlockType) {
    const key = nextKey();
    dispatch({ type: "addBlock", blockType, key });
    setOpenBlockKey(key);
    setIsPickingType(false);
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
      message={removed.kind === "block" ? "Bloc supprimé" : "Exercice retiré"}
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
    const position = openBlock.exercises.findIndex(
      (exercise) => exercise.key === openExerciseKey,
    );

    // A timed block keeps the old screen: one objective per round, which
    // the handoff des séries does not draw (US-43).
    if (!isTimedBlock(openBlock.block_type)) {
      return (
        <>
          <SetsEditor
            exercise={openExercise}
            index={position}
            total={openBlock.exercises.length}
            blockLabel={BLOCK_TYPE_LABELS[openBlock.block_type]}
            last={null}
            onChangeSets={(sets) =>
              dispatch({ type: "setSets", ...target, sets })
            }
            onChangeRest={(seconds) =>
              dispatch({ type: "updateExerciseRest", ...target, seconds })
            }
            onChangePerSide={(isPerSide) =>
              dispatch({ type: "setPerSide", ...target, isPerSide })
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

    return (
      <>
        <SetConfigurator
          exercise={openExercise}
          isTimed={isTimedBlock(openBlock.block_type)}
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
          onMoveSet={(from, to) =>
            dispatch({ type: "moveSet", ...target, from, to })
          }
          onChangePerSide={(isPerSide) =>
            dispatch({ type: "setPerSide", ...target, isPerSide })
          }
          onChangeSameLoad={(isSame) =>
            dispatch({ type: "setSameLoad", ...target, isSame })
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
          onChangeRounds={(rounds) =>
            dispatch({ type: "setBlockRounds", key: openBlockKey, rounds })
          }
          onChangeTimeLimit={(seconds) =>
            dispatch({ type: "setBlockTimeLimit", key: openBlockKey, seconds })
          }
          onAddExercises={() => addExercises(openBlockKey)}
          onOpenExercise={setOpenExerciseKey}
          onMoveExercise={(from, to) =>
            dispatch({ type: "moveExercise", blockKey: openBlockKey, from, to })
          }
          onDone={() => setOpenBlockKey(null)}
          onRemoveBlock={() => {
            setOpenBlockKey(null);
            removeBlock(openBlockKey);
          }}
        />
        {undoToast}
        {exitDialog}
      </>
    );
  }

  // The header of the form (handoff v3): what is being written, in blue,
  // above the name of the screen.
  const isProgramDay =
    edit !== undefined && edit.dayLabel !== undefined && edit.dayLabel !== null;
  const overline =
    edit === undefined
      ? "Séance libre"
      : isProgramDay
        ? `Programme · ${edit.subtitle ?? "Sans nom"}`
        : (edit.subtitle ?? draft.name);
  const title =
    edit === undefined
      ? "Nouvelle séance"
      : isProgramDay
        ? `${edit.dayLabel} · séance`
        : "Modifier la séance";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <PageHeader
        variant="form"
        onBack={goBack}
        overline={overline}
        title={title}
        strongBack={isProgramDay}
      />

      <form
        noValidate
        onSubmit={handleSave}
        className="flex flex-1 flex-col px-[18px] pt-3.5 pb-28"
      >
        {/* While saving, nothing can change anymore: one fieldset freezes all. */}
        <fieldset disabled={isSaving} className="flex flex-col">
          {edit === undefined ? (
            <div className="mb-4 grid grid-cols-[1.45fr_1fr] gap-2">
              <div className="flex min-w-0 flex-col gap-[9px]">
                <span className={FORM_LABEL}>Date</span>
                <button
                  type="button"
                  onClick={() => setIsPickingDate(true)}
                  aria-haspopup="dialog"
                  aria-label={`Date : ${formatShortDayMonth(
                    draft.planned_date,
                  )}, choisir une autre date`}
                  className={`${FORM_BOX} text-left`}
                >
                  <Icon
                    src={calendarIcon}
                    className="size-[15px] shrink-0 text-muted"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {formatShortDayMonth(draft.planned_date)}
                  </span>
                </button>
              </div>
              <TextField
                id="planned_time"
                label="Heure"
                variant="form"
                icon={clockIcon}
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
          ) : isProgramDay ? (
            // A day of a program: the day and the hour come from the
            // program and change there (RM-075, US-20).
            <div className="mb-4 grid grid-cols-[1.45fr_1fr] gap-2">
              <div className="flex min-w-0 flex-col gap-[9px]">
                <span className={FORM_LABEL}>Jour</span>
                <p className={FORM_BOX}>
                  <Icon
                    src={calendarIcon}
                    className="size-[15px] shrink-0 text-muted"
                  />
                  <span className="shrink-0">{edit.dayLabel}</span>
                  <span className="min-w-0 flex-1 truncate text-right text-[10px] font-semibold text-muted">
                    chaque sem.
                  </span>
                </p>
              </div>
              <div className="flex min-w-0 flex-col gap-[9px]">
                <span className={FORM_LABEL}>Heure</span>
                <p
                  className={`${FORM_BOX} ${
                    draft.planned_time === null ? "font-medium text-faint" : ""
                  }`}
                >
                  <Icon
                    src={clockIcon}
                    className="size-[15px] shrink-0 text-muted"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {draft.planned_time ?? "—:—"}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            // The date and the time belong to the appointment: they change
            // through "Déplacer" (US-25), never here.
            <div className="mb-4 flex flex-col gap-[9px]">
              <span className={FORM_LABEL}>Date</span>
              <p className={FORM_BOX}>
                <Icon
                  src={calendarIcon}
                  className="size-[15px] shrink-0 text-muted"
                />
                <span className="min-w-0 flex-1 truncate">
                  {formatShortDayMonth(draft.planned_date)}
                  {draft.planned_time === null
                    ? ""
                    : ` · ${draft.planned_time}`}
                </span>
              </p>
              <p className="text-[11px] font-semibold text-muted">
                Pour changer la date ou l'heure : « Déplacer ».
              </p>
            </div>
          )}

          <div className="mb-5">
            <TextField
              id="session_name"
              label="Nom de la séance"
              variant="form"
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
          </div>

          <section aria-labelledby="blocks-title" className="flex flex-col">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 id="blocks-title" className={SECTION_TITLE}>
                Blocs
              </h2>
              <p className={SECTION_COUNT}>{formatBlockCount(blockCount)}</p>
            </div>

            {blockCount === 0 ? (
              <div className={`mb-2.5 ${EMPTY_CARD}`}>
                <span aria-hidden="true" className={EMPTY_ICON_BOX}>
                  <Icon src={layersIcon} className="size-[18px]" />
                </span>
                <p className={EMPTY_TEXT}>
                  {"Ajoute un premier bloc pour y "}
                  <br />
                  mettre des exercices.
                </p>
              </div>
            ) : (
              <SessionReview
                blocks={draft.blocks}
                onEdit={setOpenBlockKey}
                onDuplicate={(key) => dispatch({ type: "duplicateBlock", key })}
                onRemove={removeBlock}
                onRemoveExercise={removeExercise}
                onMove={(from, to) => dispatch({ type: "moveBlock", from, to })}
              />
            )}

            <button
              type="button"
              onClick={() => setIsPickingType(true)}
              disabled={blockCount >= MAX_BLOCKS}
              aria-describedby={
                blockCount >= MAX_BLOCKS ? "blocks-limit" : undefined
              }
              className={DASHED_BUTTON}
            >
              <Icon src={plusIcon} className="size-[15px]" />
              Ajouter un bloc
            </button>
            {blockCount >= MAX_BLOCKS && (
              <p id="blocks-limit" className="mt-2 text-sm text-muted">
                {MAX_BLOCKS} blocs au maximum
              </p>
            )}
          </section>

          {/* With no block at all, the empty card already says it. */}
          {blockCount > 0 && exerciseCount === 0 && (
            <p
              role="status"
              className="mt-3.5 flex gap-2 rounded-[14px] border border-status-pending bg-base-100 p-3 text-sm font-semibold"
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
              className="mt-3.5 flex flex-col gap-3 rounded-[14px] border border-status-missed bg-base-100 p-4"
            >
              <p className="font-semibold">{saveError}</p>
              <button
                type="button"
                onClick={save}
                className="h-12 rounded-[12px] border border-base-300 bg-base-100 font-semibold"
              >
                Réessayer
              </button>
            </div>
          )}

          <div className="fixed inset-x-0 bottom-0 bg-base-200 px-[18px] pt-3 pb-[18px]">
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
                className={CTA}
              >
                {isSaving
                  ? "Enregistrement…"
                  : edit === undefined || isProgramDay
                    ? "Enregistrer la séance"
                    : "Vérifier les changements"}
              </button>
              {edit !== undefined && changes.length === 0 && (
                <p
                  id="no-change"
                  className="mt-2 text-center text-[11px] font-semibold text-muted"
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

      {isPickingType && (
        <BlockTypePicker
          onPick={pickBlockType}
          onClose={() => setIsPickingType(false)}
        />
      )}

      {undoToast}
      {exitDialog}
    </div>
  );
}

export default SessionEditorPage;
