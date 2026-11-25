import { type FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  addDays,
  dateSchema,
  describeRemovedDay,
  formatLongDate,
  formatWeekCount,
  formatWeekdays,
  type ProgramDetailFull,
  programInfoSchema,
  todayInParis,
  WEEKDAYS,
} from "shared";
import alertIcon from "../../../assets/icons/ui/app/alert.svg";
import Icon from "../../../components/Icon";
import PageHeader from "../../../components/PageHeader";
import TextField from "../../../components/TextField";
import { ApiError } from "../../../services/apiError";
import StepBar from "../components/StepBar";
import {
  createProgramDraft,
  updateProgramDraft,
} from "../services/programService";

// The date the Planning handed over, today otherwise.
function readStartDate(raw: string | null): string {
  return raw !== null && dateSchema.safeParse(raw).success
    ? raw
    : todayInParis();
}

type Props = {
  // Given when the page edits the information of a draft (PRO-03b)
  draft?: ProgramDetailFull;
};

// Screen PRO-02, step 1 of 3: the name, the period and the days of the
// typical week. "Suivant" saves a draft and opens the sessions (US-18).
// With a draft given, the same form edits it (PRO-03b, US-19).
function NewProgramPage({ draft }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditing = draft !== undefined;
  const [name, setName] = useState(draft?.name ?? "");
  const [description, setDescription] = useState(draft?.description ?? "");
  const [startDate, setStartDate] = useState(
    () => draft?.start_date ?? readStartDate(searchParams.get("date")),
  );
  const [endDate, setEndDate] = useState(
    () =>
      draft?.end_date ?? addDays(readStartDate(searchParams.get("date")), 41),
  );
  const [plannedTime, setPlannedTime] = useState(
    draft?.planned_time ?? "18:30",
  );
  const [weekdays, setWeekdays] = useState<number[]>(() => [
    ...new Set(draft?.sessions.map((session) => session.weekday) ?? []),
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // What unchecking a day would take away (PRO-03b). The day is only
  // really removed when the form is saved.
  const removedDays = (draft?.sessions ?? [])
    .map((session) => session.weekday)
    .filter((weekday, index, all) => all.indexOf(weekday) === index)
    .filter((weekday) => !weekdays.includes(weekday))
    .map((weekday) =>
      describeRemovedDay(startDate, endDate, draft?.sessions ?? [], weekday),
    )
    .filter((line): line is { title: string; detail: string } => line !== null);

  function toggleDay(value: number) {
    setWeekdays((current) =>
      current.includes(value)
        ? current.filter((day) => day !== value)
        : [...current, value],
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const info = {
      name,
      description: description.trim() === "" ? null : description,
      start_date: startDate,
      end_date: endDate,
      weekdays,
      planned_time: plannedTime === "" ? null : plannedTime,
    };
    const result = programInfoSchema.safeParse(info);
    if (!result.success) {
      // Every message lands under its own field (PRO-02b).
      const found: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = String(issue.path[0] ?? "name");
        found[field] ??= issue.message;
      }
      setErrors(found);
      return;
    }

    setErrors({});
    setIsSaving(true);
    try {
      const program = isEditing
        ? await updateProgramDraft(draft.id, result.data)
        : await createProgramDraft(result.data);
      navigate(`/programmes/${program.id}/seances`, { replace: true });
    } catch (caught) {
      setErrors({
        name:
          caught instanceof ApiError
            ? caught.message
            : "Impossible d'enregistrer le programme. Réessaie.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <PageHeader
        onBack={() => navigate(-1)}
        title={isEditing ? "Modifier le programme" : "Nouveau programme"}
        subtitle={isEditing ? "Informations et jours" : undefined}
      />

      <form
        noValidate
        onSubmit={submit}
        className="flex flex-col gap-3.5 px-[18px] pt-1 pb-4"
      >
        {!isEditing && <StepBar current={1} label="Informations et jours" />}
        <fieldset disabled={isSaving} className="flex flex-col gap-3.5">
          <TextField
            id="program_name"
            label="Nom du programme"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex. Hypertrophie 6 semaines"
            autoComplete="off"
            maxLength={160}
            error={errors.name}
          />
          <TextField
            id="program_description"
            label="Description (facultatif)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ex. 3 séances par semaine, haut / bas du corps"
            autoComplete="off"
            maxLength={2000}
            error={errors.description}
          />
          <div className="grid grid-cols-2 gap-2.5">
            <TextField
              id="program_start"
              label="Début"
              type="date"
              required
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              error={errors.start_date}
            />
            <TextField
              id="program_end"
              label="Fin"
              type="date"
              required
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              error={errors.end_date}
            />
          </div>
          <TextField
            id="program_time"
            label="Heure des séances (facultatif)"
            type="time"
            value={plannedTime}
            onChange={(event) => setPlannedTime(event.target.value)}
            error={errors.planned_time}
          />

          <fieldset className="flex flex-col gap-1.5">
            <legend className="font-sans text-overline uppercase not-italic text-accent">
              Jours d'entraînement *
            </legend>
            <div className="grid grid-cols-7 gap-[5px]">
              {WEEKDAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  aria-pressed={weekdays.includes(day.value)}
                  onClick={() => toggleDay(day.value)}
                  className={`flex h-11 items-center justify-center rounded-btn text-sm font-extrabold ${
                    weekdays.includes(day.value)
                      ? "bg-secondary text-secondary-content"
                      : "border border-base-300 bg-base-100 shadow-card"
                  }`}
                >
                  <span aria-hidden="true">{day.short}</span>
                  <span className="sr-only">{day.label}</span>
                </button>
              ))}
            </div>
            <p className="pt-1 text-[13px] font-semibold text-secondary">
              {formatWeekdays(weekdays)}
            </p>
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
              className="flex gap-2.5 rounded-card bg-status-pending/[0.12] p-3.5"
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

          <p className="rounded-card border border-base-300 bg-base-100 p-3 text-xs leading-[1.45] text-muted shadow-card">
            {formatLongDate(startDate)} → {formatLongDate(endDate)} ·{" "}
            {formatWeekCount(startDate, endDate)}
          </p>

          <button
            type="submit"
            className="mt-1 flex h-btn w-full items-center justify-center rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60"
          >
            {isSaving
              ? "Enregistrement…"
              : isEditing
                ? "Enregistrer"
                : "Suivant"}
          </button>
        </fieldset>
      </form>
    </div>
  );
}

export default NewProgramPage;
