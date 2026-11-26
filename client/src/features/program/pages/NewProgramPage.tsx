import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  addDays,
  dateSchema,
  describeRemovedDay,
  formatShortDayMonth,
  getWeekdayLabel,
  type ProgramDetail,
  type ProgramDetailFull,
  type ProgramSessionSummary,
  programInfoSchema,
  todayInParis,
  WEEKDAYS,
} from "shared";
import alertIcon from "../../../assets/icons/ui/app/alert.svg";
import calendarIcon from "../../../assets/icons/ui/app/calendar.svg";
import chevronRightIcon from "../../../assets/icons/ui/app/chevron-right.svg";
import saveIcon from "../../../assets/icons/ui/app/save.svg";
import Icon from "../../../components/Icon";
import PageHeader from "../../../components/PageHeader";
import TextField from "../../../components/TextField";
import { ApiError } from "../../../services/apiError";
import DatePickerSheet from "../../session-template/components/DatePickerSheet";
import {
  activateProgram,
  createProgramDraft,
  updateProgramDraft,
} from "../services/programService";

// The pieces of the program and session forms (handoff v3, 26/11/2026).
const FORM_LABEL =
  "text-[10px] font-extrabold uppercase leading-[1.2] tracking-[0.14em] text-accent";
const FORM_BOX =
  "flex h-[46px] w-full items-center gap-2.5 rounded-[12px] border border-base-300 bg-base-100 px-3 text-left text-sm font-bold";
const SECTION_TITLE =
  "font-display text-[22px] font-black not-italic leading-none tracking-[0.01em] [transform:skewX(-10deg)]";

// The date the Planning handed over, today otherwise.
function readStartDate(raw: string | null): string {
  return raw !== null && dateSchema.safeParse(raw).success
    ? raw
    : todayInParis();
}

// "LUN", "MAR"… the badge of a session card.
function dayCode(weekday: number): string {
  return getWeekdayLabel(weekday).slice(0, 3).toUpperCase();
}

// "1 exercice", "6 exercices": the line under a session that is ready.
function formatExercises(count: number): string {
  return `${count} ${count > 1 ? "exercices" : "exercice"}`;
}

// One card of the list: a saved session of the draft, or a day just
// checked whose session does not exist yet (it is created on save).
type SessionCard = {
  key: string;
  weekday: number;
  session: ProgramSessionSummary | null;
};

type Props = {
  // Given when the page edits a draft (PRO-03b)
  draft?: ProgramDetailFull;
};

// The program form (handoff v3): the name, the period, the days of the
// typical week and one session per day, on one screen. A tap on a session
// saves the draft, then opens the session of that day (US-18). Once every
// session holds an exercise, the button becomes "Créer le programme"
// (RM-072); until then, the draft can be saved as it is (RM-071).
function NewProgramPage({ draft }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [saved, setSaved] = useState<ProgramDetail | undefined>(draft);
  const [name, setName] = useState(draft?.name ?? "");
  const [startDate, setStartDate] = useState(
    () => draft?.start_date ?? readStartDate(searchParams.get("date")),
  );
  const [endDate, setEndDate] = useState(
    () =>
      draft?.end_date ?? addDays(readStartDate(searchParams.get("date")), 41),
  );
  const [weekdays, setWeekdays] = useState<number[]>(() => [
    ...new Set(draft?.sessions.map((session) => session.weekday) ?? []),
  ]);
  const [picking, setPicking] = useState<"start" | "end" | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const savedSessions = saved?.sessions ?? [];

  // What unchecking a day would take away (PRO-03b). The day is only
  // really removed when the form is saved.
  const removedDays = savedSessions
    .map((session) => session.weekday)
    .filter((weekday, index, all) => all.indexOf(weekday) === index)
    .filter((weekday) => !weekdays.includes(weekday))
    .map((weekday) =>
      describeRemovedDay(
        startDate,
        endDate,
        draft?.sessions ?? savedSessions,
        weekday,
      ),
    )
    .filter((line): line is { title: string; detail: string } => line !== null);

  // One card per checked day, in the order of the week; a day with two
  // sessions (PRO-03a) shows both.
  const cards: SessionCard[] = [...weekdays]
    .sort((a, b) => a - b)
    .flatMap((weekday): SessionCard[] => {
      const ofDay = savedSessions.filter(
        (session) => session.weekday === weekday,
      );
      return ofDay.length === 0
        ? [{ key: `day-${weekday}`, weekday, session: null }]
        : ofDay.map((session) => ({
            key: `session-${session.schedule_id}`,
            weekday,
            session,
          }));
    });
  const readyCount = cards.filter(
    (card) => card.session !== null && card.session.exercise_count > 0,
  ).length;
  const isComplete = cards.length > 0 && readyCount === cards.length;

  function toggleDay(value: number) {
    setWeekdays((current) =>
      current.includes(value)
        ? current.filter((day) => day !== value)
        : [...current, value],
    );
  }

  // Checks the form, then creates or updates the draft. Null when the form
  // has an error (shown under its field) or the server refused.
  async function saveDraft(): Promise<ProgramDetail | null> {
    const result = programInfoSchema.safeParse({
      name,
      description: saved?.description ?? null,
      start_date: startDate,
      end_date: endDate,
      weekdays,
      planned_time: saved?.planned_time ?? null,
    });
    if (!result.success) {
      // Every message lands under its own field (PRO-02b).
      const found: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = String(issue.path[0] ?? "name");
        found[field] ??= issue.message;
      }
      setErrors(found);
      return null;
    }
    setErrors({});
    setIsSaving(true);
    try {
      const program =
        saved === undefined
          ? await createProgramDraft(result.data)
          : await updateProgramDraft(saved.id, result.data);
      setSaved(program);
      return program;
    } catch (caught) {
      setErrors({
        name:
          caught instanceof ApiError
            ? caught.message
            : "Impossible d'enregistrer le programme. Réessaie.",
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  // A session card: the draft is saved first, so the day has its session.
  async function openSession(card: SessionCard) {
    const isNew = saved === undefined;
    const program = await saveDraft();
    if (program === null) {
      return;
    }
    // A new draft gets its own address first, so "back" from the session
    // comes back to this draft and not to an empty form.
    if (isNew) {
      navigate(`/programmes/${program.id}/informations`, { replace: true });
    }
    const session =
      program.sessions.find(
        (item) => item.schedule_id === card.session?.schedule_id,
      ) ?? program.sessions.find((item) => item.weekday === card.weekday);
    if (session !== undefined) {
      navigate(`/programmes/${program.id}/seances/${session.schedule_id}`);
    }
  }

  async function submit() {
    const program = await saveDraft();
    if (program === null) {
      return;
    }
    if (!isComplete) {
      // The draft stays as it is, to finish later (RM-071).
      navigate("/programmes", { replace: true });
      return;
    }
    setIsSaving(true);
    try {
      await activateProgram(program.id);
      navigate(`/programmes/${program.id}`, { replace: true });
    } catch (caught) {
      setErrors({
        name:
          caught instanceof ApiError
            ? caught.message
            : "Impossible de créer le programme. Réessaie.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <PageHeader
        variant="form"
        onBack={() => navigate(-1)}
        overline="Programme"
        title="Nouveau programme"
      />

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="flex flex-1 flex-col px-[18px] pt-4 pb-28"
      >
        <fieldset disabled={isSaving} className="flex flex-col">
          <div className="mb-4">
            <TextField
              id="program_name"
              label="Nom du programme"
              variant="form"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex. Force 8 semaines"
              autoComplete="off"
              maxLength={160}
              error={errors.name}
            />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="flex min-w-0 flex-col gap-[9px]">
              <span className={FORM_LABEL}>Début</span>
              <button
                type="button"
                onClick={() => setPicking("start")}
                aria-haspopup="dialog"
                aria-label={`Début : ${formatShortDayMonth(startDate)}, choisir une autre date`}
                className={FORM_BOX}
              >
                <Icon
                  src={calendarIcon}
                  className="size-[15px] shrink-0 text-muted"
                />
                <span className="min-w-0 truncate">
                  {formatShortDayMonth(startDate)}
                </span>
              </button>
              {errors.start_date !== undefined && (
                <p role="alert" className="text-sm font-semibold">
                  {errors.start_date}
                </p>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-[9px]">
              <span className={FORM_LABEL}>Fin</span>
              <button
                type="button"
                onClick={() => setPicking("end")}
                aria-haspopup="dialog"
                aria-label={`Fin : ${formatShortDayMonth(endDate)}, choisir une autre date`}
                className={FORM_BOX}
              >
                <Icon
                  src={calendarIcon}
                  className="size-[15px] shrink-0 text-muted"
                />
                <span className="min-w-0 truncate">
                  {formatShortDayMonth(endDate)}
                </span>
              </button>
              {errors.end_date !== undefined && (
                <p role="alert" className="text-sm font-semibold">
                  {errors.end_date}
                </p>
              )}
            </div>
          </div>

          <fieldset className="mb-5 flex flex-col gap-[9px]">
            <legend className={`${FORM_LABEL} mb-[9px]`}>
              Jours d'entraînement
            </legend>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((day) => {
                const isOn = weekdays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    aria-pressed={isOn}
                    onClick={() => toggleDay(day.value)}
                    className={`flex h-9 items-center justify-center rounded-[9px] border text-[13px] font-extrabold ${
                      isOn
                        ? "border-brand bg-brand text-white shadow-day"
                        : "border-base-300 bg-base-100 text-muted"
                    }`}
                  >
                    <span aria-hidden="true">{day.label.charAt(0)}</span>
                    <span className="sr-only">{day.label}</span>
                  </button>
                );
              })}
            </div>
            {errors.weekdays !== undefined && (
              <p role="alert" className="text-sm font-semibold">
                {errors.weekdays}
              </p>
            )}
          </fieldset>

          {removedDays.map((removed) => (
            <div
              key={removed.title}
              role="status"
              className="mb-4 flex gap-2.5 rounded-[14px] bg-status-pending/[0.12] p-3.5"
            >
              <Icon
                src={alertIcon}
                className="mt-px size-[18px] shrink-0 text-status-pending-text"
              />
              <p className="flex flex-col gap-1 text-[13px] leading-[1.45]">
                <b className="font-bold text-status-pending-text">
                  {removed.title}
                </b>
                <span className="text-muted">{removed.detail}</span>
              </p>
            </div>
          ))}

          <section aria-labelledby="sessions-title" className="flex flex-col">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 id="sessions-title" className={SECTION_TITLE}>
                Séances
              </h2>
              <p className="text-[11px] font-bold text-muted">
                {cards.length} par semaine
              </p>
            </div>

            {cards.length === 0 ? (
              <div className="flex flex-col items-center gap-3.5 rounded-[16px] border border-empty-border bg-empty px-[30px] py-[26px] shadow-card">
                <span
                  aria-hidden="true"
                  className="grid size-10 place-items-center rounded-[10px] bg-icon-box text-icon-stroke"
                >
                  <Icon src={calendarIcon} className="size-[18px]" />
                </span>
                <p className="text-center text-[13px] font-medium leading-[1.5] text-empty-text">
                  {"Choisis tes jours d'entraînement : "}
                  <br />
                  {"une séance à composer apparaîtra "}
                  <br />
                  pour chacun.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-1.5 flex justify-between text-[11px]">
                  <span className="font-bold text-strong">
                    {readyCount} / {cards.length} prêtes
                  </span>
                  <span className="font-medium text-faint">
                    {isComplete ? "Prêt" : "Brouillon"}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Séances prêtes"
                  aria-valuemin={0}
                  aria-valuemax={cards.length}
                  aria-valuenow={readyCount}
                  className="mb-3.5 h-1 overflow-hidden rounded-[2px] bg-track"
                >
                  <div
                    className="h-full rounded-[2px] bg-brand transition-[width] duration-[250ms]"
                    style={{ width: `${(readyCount / cards.length) * 100}%` }}
                  />
                </div>
                <ul className="flex flex-col gap-[9px]">
                  {cards.map((card) => {
                    const isReady =
                      card.session !== null && card.session.exercise_count > 0;
                    return (
                      <li key={card.key}>
                        <button
                          type="button"
                          onClick={() => void openSession(card)}
                          className="flex w-full items-center gap-3 rounded-[14px] border border-base-300 bg-base-100 py-2 pr-3 pl-2 text-left shadow-card"
                        >
                          <span
                            aria-hidden="true"
                            className={`grid size-11 shrink-0 place-items-center rounded-[10px] border text-xs font-extrabold tracking-[0.08em] ${
                              isReady
                                ? "border-brand bg-ready text-ready-content"
                                : "border-badge-border bg-soft text-muted"
                            }`}
                          >
                            {dayCode(card.weekday)}
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="sr-only">
                              {`${getWeekdayLabel(card.weekday)} : `}
                            </span>
                            <span
                              className={`truncate text-sm font-semibold ${
                                isReady
                                  ? "text-base-content"
                                  : "text-card-title"
                              }`}
                            >
                              {isReady ? "Séance prête" : "Séance vide"}
                            </span>
                            <span className="mt-0.5 truncate text-[11px] font-semibold text-card-sub">
                              {isReady && card.session !== null
                                ? `${card.session.name} · ${formatExercises(
                                    card.session.exercise_count,
                                  )}`
                                : "Ajoute des blocs et des exercices"}
                            </span>
                          </span>
                          <span
                            aria-hidden="true"
                            className="grid size-7 shrink-0 place-items-center text-muted"
                          >
                            <Icon
                              src={chevronRightIcon}
                              className="size-[18px]"
                            />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>

          <div className="fixed inset-x-0 bottom-0 bg-base-200 px-[18px] pt-3 pb-[18px]">
            <div className="mx-auto max-w-md">
              {isComplete ? (
                <button
                  type="submit"
                  className="flex h-[50px] w-full items-center justify-center rounded-[12px] bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60"
                >
                  {isSaving ? "Enregistrement…" : "Créer le programme"}
                </button>
              ) : (
                <button
                  type="submit"
                  className="flex h-[50px] w-full items-center justify-center gap-2.5 rounded-[12px] border border-btn2-border bg-btn2 text-[15px] font-extrabold uppercase tracking-[0.02em] text-btn2-text disabled:opacity-60"
                >
                  <Icon src={saveIcon} className="size-[15px] text-btn2-icon" />
                  {isSaving ? "Enregistrement…" : "Enregistrer le brouillon"}
                </button>
              )}
            </div>
          </div>
        </fieldset>
      </form>

      {picking !== null && (
        <DatePickerSheet
          title={
            picking === "start" ? "Début du programme" : "Fin du programme"
          }
          value={picking === "start" ? startDate : endDate}
          onConfirm={(date) => {
            if (picking === "start") {
              setStartDate(date);
            } else {
              setEndDate(date);
            }
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
}

export default NewProgramPage;
