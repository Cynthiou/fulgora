import { type FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  addDays,
  dateSchema,
  formatLongDate,
  formatWeekCount,
  formatWeekdays,
  programInfoSchema,
  todayInParis,
  WEEKDAYS,
} from "shared";
import chevronLeftIcon from "../../../assets/icons/ui/chevrons/chevron-left.svg";
import Icon from "../../../components/Icon";
import TextField from "../../../components/TextField";
import { ApiError } from "../../../services/apiError";
import { createProgramDraft } from "../services/programService";

// The date the Planning handed over, today otherwise.
function readStartDate(raw: string | null): string {
  return raw !== null && dateSchema.safeParse(raw).success
    ? raw
    : todayInParis();
}

// Screen PRO-02, step 1 of 3: the name, the period and the days of the
// typical week. "Suivant" saves a draft and opens the sessions (US-18).
function NewProgramPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(() =>
    readStartDate(searchParams.get("date")),
  );
  const [endDate, setEndDate] = useState(() =>
    addDays(readStartDate(searchParams.get("date")), 41),
  );
  const [plannedTime, setPlannedTime] = useState("18:30");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

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
      const program = await createProgramDraft(result.data);
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
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-base-300 bg-base-100 px-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Retour"
          className="flex size-tap items-center justify-center rounded-btn text-secondary"
        >
          <Icon src={chevronLeftIcon} className="size-7" />
        </button>
        <div className="flex min-w-0 flex-col">
          <h1 className="text-display-sm">Nouveau programme</h1>
          <p className="text-sm text-muted">
            Étape 1 / 3 · Informations et jours
          </p>
        </div>
      </header>

      <form noValidate onSubmit={submit} className="flex flex-col gap-6 p-4">
        <fieldset disabled={isSaving} className="flex flex-col gap-6">
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
          <TextField
            id="program_time"
            label="Heure des séances (facultatif)"
            type="time"
            value={plannedTime}
            onChange={(event) => setPlannedTime(event.target.value)}
            error={errors.planned_time}
          />

          <fieldset className="flex flex-col gap-2">
            <legend className="font-sans text-overline not-italic uppercase text-accent">
              Jours de la semaine *
            </legend>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  aria-pressed={weekdays.includes(day.value)}
                  onClick={() => toggleDay(day.value)}
                  className={`flex h-12 items-center justify-center rounded-btn border font-semibold ${
                    weekdays.includes(day.value)
                      ? "border-neutral bg-neutral text-neutral-content"
                      : "border-base-300 bg-base-100"
                  }`}
                >
                  <span aria-hidden="true">{day.short}</span>
                  <span className="sr-only">{day.label}</span>
                </button>
              ))}
            </div>
            <p className="text-sm text-muted">{formatWeekdays(weekdays)}</p>
            {errors.weekdays !== undefined && (
              <p role="alert" className="text-sm font-semibold">
                {errors.weekdays}
              </p>
            )}
          </fieldset>

          <p className="rounded-card border border-base-300 bg-base-100 p-3 text-sm text-muted shadow-card">
            {formatLongDate(startDate)} → {formatLongDate(endDate)} ·{" "}
            {formatWeekCount(startDate, endDate)}
          </p>

          <button
            type="submit"
            className="flex h-btn w-full items-center justify-center rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action disabled:opacity-60"
          >
            {isSaving ? "Enregistrement…" : "Suivant"}
          </button>
        </fieldset>
      </form>
    </div>
  );
}

export default NewProgramPage;
