import { type FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  countPlanChanges,
  formatPlannedAppointment,
  formatShortDayMonth,
  getWeekdayLabel,
  type ProgramDetailFull,
  type ProgramScheduleInput,
  type SchedulePlan,
  WEEKDAYS,
} from "shared";
import arrowRightIcon from "../../../assets/icons/ui/app/arrow-right.svg";
import calendarIcon from "../../../assets/icons/ui/app/calendar.svg";
import checkIcon from "../../../assets/icons/ui/app/check.svg";
import clockIcon from "../../../assets/icons/ui/app/clock.svg";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
import LoadingState from "../../../components/LoadingState";
import PageHeader from "../../../components/PageHeader";
import TextField from "../../../components/TextField";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { isAbortError } from "../../../services/api";
import { ApiError } from "../../../services/apiError";
import {
  previewProgramSchedule,
  readProgram,
  updateProgramSchedule,
} from "../services/programService";

// One line of the typical week, as the screen holds it while it is edited.
type SessionWish = {
  schedule_id: number;
  name: string;
  weekday: number;
  planned_time: string | null;
  // What the program says today, to write "Avant : samedi"
  was_weekday: number;
  was_time: string | null;
};

const FIELD =
  "h-field w-full min-w-0 rounded-btn border border-base-300 bg-base-100 pr-4 pl-11 text-[15px] shadow-card";

function toWishes(program: ProgramDetailFull): SessionWish[] {
  return program.sessions.map((session) => ({
    schedule_id: session.schedule_id,
    name: session.name,
    weekday: session.weekday,
    planned_time: session.planned_time,
    was_weekday: session.weekday,
    was_time: session.planned_time,
  }));
}

function toInput(
  name: string,
  endDate: string,
  wishes: SessionWish[],
): ProgramScheduleInput {
  return {
    name: name.trim(),
    end_date: endDate,
    sessions: wishes.map((wish) => ({
      schedule_id: wish.schedule_id,
      weekday: wish.weekday,
      planned_time: wish.planned_time,
    })),
  };
}

// Screen PRO-08: the day, the hour and the end of a program already in the
// Planning. Every change is shown appointment by appointment before being
// written, and the server redoes the same computation (US-20).
function EditProgramPage() {
  const params = useParams();
  const id = Number(params.programId);
  const navigate = useNavigate();
  const [program, setProgram] = useState<ProgramDetailFull | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [name, setName] = useState("");
  const [endDate, setEndDate] = useState("");
  const [wishes, setWishes] = useState<SessionWish[]>([]);
  const [plan, setPlan] = useState<SchedulePlan | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is listed on purpose, it re-runs the load
  useEffect(() => {
    const controller = new AbortController();
    setLoadError(null);
    readProgram(id, controller.signal)
      .then((data) => {
        setProgram(data);
        setName(data.name);
        setEndDate(data.end_date);
        setWishes(toWishes(data));
      })
      .catch((caught: unknown) => {
        if (!isAbortError(caught)) {
          setLoadError("Impossible de charger ce programme.");
        }
      });
    return () => controller.abort();
  }, [id, attempt]);

  // The preview waits for a pause in the typing, then asks the server.
  const asked = useDebouncedValue(
    JSON.stringify(toInput(name, endDate, wishes)),
    400,
  );

  useEffect(() => {
    if (program === null || name.trim() === "" || endDate === "") {
      return;
    }
    const controller = new AbortController();
    setIsPreviewing(true);
    setPreviewError(null);
    previewProgramSchedule(
      id,
      JSON.parse(asked) as ProgramScheduleInput,
      controller.signal,
    )
      .then((data) => {
        setPlan(data);
        setIsPreviewing(false);
      })
      .catch((caught: unknown) => {
        if (isAbortError(caught)) {
          return;
        }
        setPreviewError(
          caught instanceof ApiError
            ? caught.message
            : "Impossible de calculer l'aperçu.",
        );
        setIsPreviewing(false);
      });
    return () => controller.abort();
  }, [id, asked, program, name, endDate]);

  function change(scheduleId: number, patch: Partial<SessionWish>) {
    setWishes((current) =>
      current.map((wish) =>
        wish.schedule_id === scheduleId ? { ...wish, ...patch } : wish,
      ),
    );
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (program === null || isSaving) {
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateProgramSchedule(id, toInput(name, endDate, wishes));
      navigate(`/programmes/${id}`, {
        replace: true,
        state: { flash: "Programme modifié." },
      });
    } catch (caught: unknown) {
      setSaveError(
        caught instanceof ApiError
          ? caught.message
          : "Impossible d'enregistrer ce changement.",
      );
      setIsSaving(false);
    }
  }

  if (loadError !== null) {
    return (
      <div className="mx-auto max-w-md p-4">
        <ErrorState
          title={loadError}
          message="Vérifie ta connexion internet, puis réessaie."
          onRetry={() => setAttempt((count) => count + 1)}
        />
      </div>
    );
  }

  if (program === null) {
    return (
      <div className="mx-auto max-w-md p-4">
        <LoadingState label="Chargement du programme…" />
      </div>
    );
  }

  const changed =
    name.trim() !== program.name ||
    endDate !== program.end_date ||
    wishes.some(
      (wish) =>
        wish.weekday !== wish.was_weekday ||
        wish.planned_time !== wish.was_time,
    );
  const total = plan === null ? 0 : countPlanChanges(plan);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <PageHeader
        onBack={() => navigate(`/programmes/${id}`)}
        backLabel="Retour au programme"
        title="Modifier le programme"
        subtitle={program.name}
      />

      <form
        onSubmit={save}
        className="flex flex-1 flex-col gap-2.5 px-[18px] pt-1 pb-28"
      >
        <fieldset disabled={isSaving} className="flex flex-col gap-2.5">
          <TextField
            id="program_name"
            label="Nom du programme"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={160}
            autoComplete="off"
          />
          <TextField
            id="program_end"
            label="Fin du programme"
            type="date"
            required
            value={endDate}
            min={program.start_date}
            onChange={(event) => setEndDate(event.target.value)}
            help="Avancer la fin annule les séances au-delà ; reculer la fin ajoute des semaines."
          />

          <span className="font-sans text-overline uppercase not-italic text-muted">
            Semaine type
          </span>
          {wishes.map((wish) => (
            <div
              key={wish.schedule_id}
              className="flex flex-col gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
            >
              <b className="text-[15px] font-extrabold">{wish.name}</b>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={`day-${wish.schedule_id}`}
                    className="font-sans text-overline uppercase not-italic text-accent"
                  >
                    Jour
                  </label>
                  <div className="relative flex items-center">
                    <span className="pointer-events-none absolute left-4 text-muted">
                      <Icon src={calendarIcon} className="size-[18px]" />
                    </span>
                    <select
                      id={`day-${wish.schedule_id}`}
                      value={wish.weekday}
                      onChange={(event) =>
                        change(wish.schedule_id, {
                          weekday: Number(event.target.value),
                        })
                      }
                      className={FIELD}
                    >
                      {WEEKDAYS.map((day) => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {wish.weekday !== wish.was_weekday && (
                    <p className="text-xs leading-[1.45] text-muted">
                      {`Avant : ${getWeekdayLabel(
                        wish.was_weekday,
                      ).toLocaleLowerCase("fr-FR")}`}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={`time-${wish.schedule_id}`}
                    className="font-sans text-overline uppercase not-italic text-accent"
                  >
                    Heure
                  </label>
                  <div className="relative flex items-center">
                    <span className="pointer-events-none absolute left-4 text-muted">
                      <Icon src={clockIcon} className="size-[18px]" />
                    </span>
                    <input
                      id={`time-${wish.schedule_id}`}
                      type="time"
                      value={wish.planned_time ?? ""}
                      onChange={(event) =>
                        change(wish.schedule_id, {
                          planned_time:
                            event.target.value === ""
                              ? null
                              : event.target.value,
                        })
                      }
                      className={FIELD}
                    />
                  </div>
                  {wish.planned_time !== wish.was_time && (
                    <p className="text-xs leading-[1.45] text-muted">
                      {`Avant : ${wish.was_time ?? "sans heure"}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          <section
            aria-live="polite"
            className="flex flex-col gap-3 rounded-card border border-base-300 bg-base-100 p-4 shadow-card"
          >
            <span className="font-sans text-overline uppercase not-italic text-accent">
              {`Rendez-vous concernés · ${total}`}
            </span>
            {isPreviewing && <p className="text-sm text-muted">Calcul…</p>}
            {previewError !== null && (
              <p className="text-sm font-semibold text-status-missed-text">
                {previewError}
              </p>
            )}
            {plan?.moved.map((moved) => (
              <p
                key={`moved-${moved.appointment_id}`}
                className="flex items-center gap-2 text-[13px] font-semibold"
              >
                <span className="text-muted line-through">
                  {formatShortDayMonth(moved.from_date)}
                </span>
                <Icon
                  src={arrowRightIcon}
                  className="size-3.5 shrink-0 text-secondary"
                />
                <b>
                  {formatPlannedAppointment({
                    schedule_id: moved.schedule_id,
                    planned_date: moved.to_date,
                    planned_time: moved.to_time,
                  })}
                </b>
              </p>
            ))}
            {plan?.created.map((created) => (
              <p
                key={`created-${created.planned_date}-${created.schedule_id}`}
                className="text-[13px] font-semibold"
              >
                {`Ajoutée : ${formatPlannedAppointment(created)}`}
              </p>
            ))}
            {plan?.cancelled.map((cancelled) => (
              <p
                key={`cancelled-${cancelled.appointment_id}`}
                className="text-[13px] font-semibold text-status-cancelled-text"
              >
                {`Annulée : ${formatShortDayMonth(cancelled.planned_date)}`}
              </p>
            ))}
            {total === 0 && !isPreviewing && previewError === null && (
              <p className="text-sm text-muted">
                Aucun rendez-vous ne bouge pour l'instant.
              </p>
            )}
            {plan?.notes.map((note) => (
              <p key={note} className="text-xs leading-[1.45] text-muted">
                {note}
              </p>
            ))}
          </section>

          {saveError !== null && (
            <p role="alert" className="text-sm font-semibold">
              {saveError}
            </p>
          )}
        </fieldset>
      </form>

      <div className="fixed inset-x-0 bottom-0 px-[18px] pt-3 pb-1">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={save}
            disabled={!changed || isSaving || name.trim() === ""}
            className="flex h-btn w-full items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60"
          >
            <Icon src={checkIcon} className="size-[18px]" />
            {isSaving ? "Enregistrement…" : "Enregistrer"}
          </button>
          {!changed && (
            <p className="mt-2 text-center text-sm text-muted">
              Rien n'a changé pour l'instant.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default EditProgramPage;
