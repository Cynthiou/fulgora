import * as z from "zod";
import type { AppointmentStatus, WorkoutStatus } from "./appointment.js";
import type { MeasureCode } from "./catalog.js";
import {
  type BlockType,
  boundedValue,
  DEFAULT_REST_SECONDS,
  formatDuration,
  formatMinSec,
  formatSetValues,
  getMeasureProfile,
  type PlannedSetValues,
  plannedSetSchema,
  SET_LIMITS,
} from "./session-template.js";
import { dateSchema } from "./validation.js";

// --- The session in progress (home page, profile) ---------------------------

export type CurrentWorkoutSession = {
  id: number;
  appointment_id: number;
  session_name: string;
  // ISO date-time of the real start, for example "2026-11-25T17:34:00.000Z".
  started_at: string;
  // "6 / 11 séries" on the home page (D-08: a cardio step counts as a set).
  validated_sets: number;
  planned_sets: number;
};

// --- Starting a session (US-28) ------------------------------------------------

// POST /api/workout-sessions: the body carries a number, not an address part.
export const startWorkoutSchema = z.object({
  appointment_id: z.number().int().positive({ error: "Identifiant invalide." }),
});
export type StartWorkoutInput = z.output<typeof startWorkoutSchema>;
export type WorkoutStarted = { id: number };

// --- The planned session, as the detail screen (B1) shows it -----------------

export type AppointmentDetail = {
  id: number;
  planned_date: string;
  planned_time: string | null;
  status: AppointmentStatus;
  // When the appointment was cancelled, in ISO (RM-035); null otherwise
  cancelled_at: string | null;
  // The day it was first planned for, once it was moved by hand (RM-032)
  initial_date: string | null;
  moved_manually: boolean;
  session_name: string;
  program_name: string | null;
  // The realized session, when the appointment was started
  workout_session: { id: number; status: WorkoutStatus } | null;
  blocks: {
    id: number;
    block_type: BlockType;
    name: string | null;
    position: number;
    exercises: {
      id: number;
      exercise_id: number;
      name: string;
      // "4 × 8 · 60 kg", what the card of the day shows (03-2)
      set_summary: string | null;
    }[];
  }[];
};

// --- The realized session, whole tree (B2) -------------------------------------

// One set of a realized session: the planned values copied at the start
// (frozen, RM-041) and the actual ones, empty until the set is validated.
export type WorkoutSetRow = {
  id: number;
  position: number;
  reps_planned: number | null;
  reps_actual: number | null;
  weight_planned_kg: number | null;
  weight_actual_kg: number | null;
  // The two planned loads of a per-side set (US-51)
  weight_left_planned_kg: number | null;
  weight_right_planned_kg: number | null;
  duration_planned_seconds: number | null;
  duration_actual_seconds: number | null;
  distance_planned_meters: number | null;
  distance_actual_meters: number | null;
  speed_planned_kmh: number | null;
  speed_actual_kmh: number | null;
  resistance_planned: number | null;
  resistance_actual: number | null;
  incline_planned_percent: number | null;
  incline_actual_percent: number | null;
  calories_planned: number | null;
  calories_actual: number | null;
  planned_rest_seconds: number | null;
  // ISO date-time, null while the set is not done
  validated_at: string | null;
  // Filled the day the set was corrected after the session (US-37, RM-049)
  updated_at: string | null;
  // Added during the session: no planned values, and it can be removed
  // (US-32, RM-043, RM-048)
  is_added: boolean;
  // What was done on each side, for a per-side exercise (US-51)
  sides: WorkoutSetSide[];
};

export const SIDES = ["left", "right"] as const;
export type SideCode = (typeof SIDES)[number];

export const SIDE_LABELS: Record<SideCode, string> = {
  left: "Gauche",
  right: "Droite",
};

// What was really done on one side of a set (US-51, RM-044).
export type WorkoutSetSide = {
  side: SideCode;
  reps_actual: number | null;
  weight_actual_kg: number | null;
  duration_actual_seconds: number | null;
  validated_at: string;
};

export type WorkoutExerciseTree = {
  id: number;
  exercise_id: number;
  position: number;
  name: string;
  // "Pectoraux · Barre"
  meta: string | null;
  measure_codes: MeasureCode[];
  // Body weight exercise: its load is an added weight ("lest", A7b)
  is_bodyweight: boolean;
  // Done side by side, left then right (US-51, B5g)
  is_per_side: boolean;
  default_rest_seconds: number | null;
  // Added during the session (US-32)
  is_added: boolean;
  sets: WorkoutSetRow[];
};

export type WorkoutBlockTree = {
  id: number;
  block_type: BlockType;
  name: string | null;
  position: number;
  instructions: string | null;
  // Added during the session (US-32)
  is_added: boolean;
  exercises: WorkoutExerciseTree[];
};

export type WorkoutSessionTree = {
  id: number;
  appointment_id: number;
  session_name: string;
  program_name: string | null;
  status: WorkoutStatus;
  started_at: string;
  ended_at: string | null;
  // True when the server closed it after 4 hours without activity (RM-065)
  auto_closed: boolean;
  // True when the session was written after the fact (US-38)
  declared_afterwards: boolean;
  blocks: WorkoutBlockTree[];
};

// --- Helpers -------------------------------------------------------------------

// The planned side of a set, in the shape of the editor (for the summaries).
export function toPlannedValues(set: WorkoutSetRow): PlannedSetValues {
  return {
    reps: set.reps_planned,
    weight_kg: set.weight_planned_kg,
    weight_left_kg: set.weight_left_planned_kg,
    weight_right_kg: set.weight_right_planned_kg,
    duration_seconds: set.duration_planned_seconds,
    distance_meters: set.distance_planned_meters,
    speed_kmh: set.speed_planned_kmh,
    resistance: set.resistance_planned,
    incline_percent: set.incline_planned_percent,
    calories: set.calories_planned,
    rest_after_seconds: set.planned_rest_seconds,
  };
}

function allSets(tree: Pick<WorkoutSessionTree, "blocks">): WorkoutSetRow[] {
  return tree.blocks.flatMap((block) =>
    block.exercises.flatMap((exercise) => exercise.sets),
  );
}

// "Séries réalisées 3 / 18": a cardio stage counts as a set (D-08).
export function countPlannedSets(
  tree: Pick<WorkoutSessionTree, "blocks">,
): number {
  return allSets(tree).length;
}

export function countValidatedSets(
  tree: Pick<WorkoutSessionTree, "blocks">,
): number {
  return allSets(tree).filter((set) => set.validated_at !== null).length;
}

// "1 / 3 séries" on an exercise row (B2).
export function formatSetProgress(
  exercise: Pick<WorkoutExerciseTree, "sets" | "measure_codes">,
  isCardio: boolean,
): string {
  const done = exercise.sets.filter((set) => set.validated_at !== null).length;
  const total = exercise.sets.length;
  const noun = isCardio
    ? total > 1
      ? "étapes"
      : "étape"
    : total > 1
      ? "séries"
      : "série";
  return `${done} / ${total} ${noun}`;
}

// "12:40" since the real start, "1:02:05" above an hour; never negative.
export function formatElapsed(startedAt: string, now: Date): string {
  const seconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(startedAt).getTime()) / 1000),
  );
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const minSec = `${hours > 0 ? String(minutes).padStart(2, "0") : minutes}:${String(rest).padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${minSec}` : minSec;
}

// --- Validating a set (US-29) ---------------------------------------------------

// What the user really did on one set: the same measures and limits as the
// plan, without the rest (the rest belongs to the plan).
export const actualSetSchema = plannedSetSchema.omit({
  rest_after_seconds: true,
  // The two loads are planned, never recorded: each side keeps its own
  // values in its own row (US-51).
  weight_left_kg: true,
  weight_right_kg: true,
});
export type ActualSetValues = z.output<typeof actualSetSchema>;

// The values of a form, in the shape of a planned set: the two per-side
// loads are planned only, so they are empty here (US-51).
export function toPlannedShape(
  values: ActualSetValues,
  restAfterSeconds: number | null = null,
): PlannedSetValues {
  return {
    ...values,
    weight_left_kg: null,
    weight_right_kg: null,
    rest_after_seconds: restAfterSeconds,
  };
}

// The actual side of a set, in the shape of the form.
export function toActualValues(set: WorkoutSetRow): ActualSetValues {
  return {
    reps: set.reps_actual,
    weight_kg: set.weight_actual_kg,
    duration_seconds: set.duration_actual_seconds,
    distance_meters: set.distance_actual_meters,
    speed_kmh: set.speed_actual_kmh,
    resistance: set.resistance_actual,
    incline_percent: set.incline_actual_percent,
    calories: set.calories_actual,
  };
}

// The planned values as a starting point for the actual ones ("fait comme
// prévu" = one tap).
export function plannedAsActual(set: WorkoutSetRow): ActualSetValues {
  const { rest_after_seconds: _rest, ...values } = toPlannedValues(set);
  return values;
}

// A set with nothing in it, or zeros only, cannot be validated.
export function isEmptySet(values: ActualSetValues): boolean {
  return Object.values(values).every((value) => value === null || value === 0);
}

const ACTUAL_FIELDS: (keyof ActualSetValues)[] = [
  "reps",
  "weight_kg",
  "duration_seconds",
  "distance_meters",
  "speed_kmh",
  "incline_percent",
  "resistance",
  "calories",
];

function formatGapValue(field: keyof ActualSetValues, amount: number): string {
  const format = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
  switch (field) {
    case "reps":
      return `${format.format(amount)} rép.`;
    case "weight_kg":
      return `${format.format(amount)} kg`;
    case "duration_seconds":
      return formatDuration(amount);
    case "distance_meters":
      return `${format.format(amount / 1000)} km`;
    case "speed_kmh":
      return `${format.format(amount)} km/h`;
    case "incline_percent":
      return `${format.format(amount)} %`;
    case "resistance":
      return `résistance ${format.format(amount)}`;
    case "calories":
      return `${format.format(amount)} kcal`;
  }
}

// How the actual set compares with the plan: "=" when identical, otherwise
// the first difference, "▲ 2,5 kg" (more) or "▼ 1 rép." (less).
export function getSetGap(set: WorkoutSetRow): string {
  const planned = plannedAsActual(set);
  const actual = toActualValues(set);
  for (const field of ACTUAL_FIELDS) {
    const before = planned[field] ?? 0;
    const after = actual[field] ?? 0;
    if (before !== after) {
      const amount = Math.round(Math.abs(after - before) * 1000) / 1000;
      return `${after > before ? "▲" : "▼"} ${formatGapValue(field, amount)}`;
    }
  }
  return "=";
}

// True when every planned value was reached or passed.
export function isObjectiveReached(set: WorkoutSetRow): boolean {
  const planned = plannedAsActual(set);
  const actual = toActualValues(set);
  return ACTUAL_FIELDS.every((field) => {
    const target = planned[field];
    if (target === null) {
      return true;
    }
    const done = actual[field];
    return done !== null && done >= target;
  });
}

// "10 rép. · 40 kg" for the values really done.
export function formatActualValues(
  set: WorkoutSetRow,
  codes: MeasureCode[],
  isBodyweight = false,
): string {
  return formatSetValues(
    toPlannedShape(toActualValues(set)),
    codes,
    isBodyweight,
  );
}

// --- Rest timer (US-30) --------------------------------------------------------

// How long to rest after a set: its own rest, else the exercise's default,
// else 1 min 30 (RM-023).
export function getRestDuration(
  set: Pick<WorkoutSetRow, "planned_rest_seconds">,
  exercise: Pick<WorkoutExerciseTree, "default_rest_seconds">,
): number {
  return (
    set.planned_rest_seconds ??
    exercise.default_rest_seconds ??
    DEFAULT_REST_SECONDS
  );
}

// "1:12" on the rest screen: the same writing as the min:s fields.
export function formatClock(seconds: number): string {
  return formatMinSec(Math.max(0, seconds));
}

// --- Summary of a session (US-34) ----------------------------------------------

// Seconds between the real start and the end (now when still running).
export function computeDurationSeconds(
  startedAt: string,
  endedAt: string | null,
  now: Date = new Date(),
): number {
  const end = endedAt === null ? now.getTime() : new Date(endedAt).getTime();
  return Math.max(0, Math.floor((end - new Date(startedAt).getTime()) / 1000));
}

// Kilograms moved: reps x weight of every validated set; no weight counts 0
// (RM-051: computed, never stored).
export function computeTonnage(sets: WorkoutSetRow[]): number {
  const total = sets
    .filter((set) => set.validated_at !== null)
    .reduce((sum, set) => {
      // A per-side set counts each side with its own load (US-51).
      if (set.sides.length > 0) {
        return (
          sum +
          set.sides.reduce(
            (sides, side) =>
              sides + (side.reps_actual ?? 0) * (side.weight_actual_kg ?? 0),
            0,
          )
        );
      }
      return sum + (set.reps_actual ?? 0) * (set.weight_actual_kg ?? 0);
    }, 0);
  return Math.round(total * 1000) / 1000;
}

// "3 240 kg".
export function formatTonnage(kilograms: number): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(kilograms)} kg`;
}

// "48 min", "1 h 05", "42 s".
export function formatSummaryDuration(seconds: number): string {
  return formatDuration(seconds);
}

// "3 / 3 · 10, 8, 10 rép.", "3 / 3 · 1 min, 1 min, 42 s", "3 / 3 · 18 min 12 s"
// for cardio (durations added up), "2 / 3 · série 3 non faite".
export function formatExerciseResult(
  exercise: Pick<WorkoutExerciseTree, "sets" | "measure_codes"> & {
    is_bodyweight?: boolean;
  },
): string {
  const profile = getMeasureProfile(
    exercise.measure_codes,
    exercise.is_bodyweight,
  );
  const done = exercise.sets.filter((set) => set.validated_at !== null);
  const total = exercise.sets.length;
  const head = `${done.length} / ${total}`;

  const parts: string[] = [];
  // A per-side exercise says both sides, set by set (US-51, B6).
  const isPerSide = exercise.sets.some((set) => set.sides.length > 0);
  if (done.length > 0 && isPerSide) {
    parts.push(
      done
        .map((set) =>
          formatBothSides(
            set,
            exercise.measure_codes,
            exercise.is_bodyweight ?? false,
          ),
        )
        .join(" · "),
    );
  } else if (done.length > 0) {
    if (profile === "weighted" || profile === "bodyweight") {
      const reps = done.map((set) => set.reps_actual ?? 0);
      parts.push(`${reps.join(", ")} rép.`);
    } else if (profile === "duration") {
      parts.push(
        done
          .map((set) => formatDuration(set.duration_actual_seconds ?? 0))
          .join(", "),
      );
    } else if (profile === "cardio") {
      const seconds = done.reduce(
        (sum, set) => sum + (set.duration_actual_seconds ?? 0),
        0,
      );
      if (seconds > 0) {
        parts.push(formatDuration(seconds));
      }
    }
  }

  const noun = profile === "cardio" ? "étape" : "série";
  // "série 3 incomplète : gauche 30 s, droite non faite" (US-51, B6)
  for (const [index, set] of exercise.sets.entries()) {
    if (set.validated_at === null && set.sides.length === 1) {
      const sides = SIDES.map((side) =>
        getSide(set, side) === null
          ? `${SIDE_LABELS[side].toLocaleLowerCase("fr-FR")} non faite`
          : formatSideState(
              set,
              side,
              exercise.measure_codes,
              exercise.is_bodyweight ?? false,
            )
              .replace(" ✓", "")
              .toLocaleLowerCase("fr-FR")
              .replace(" : ", " "),
      );
      parts.push(`${noun} ${index + 1} incomplète : ${sides.join(", ")}`);
    }
  }

  const missing = exercise.sets
    .map((set, index) =>
      set.validated_at === null && set.sides.length !== 1 ? index + 1 : null,
    )
    .filter((position): position is number => position !== null);
  if (missing.length > 0) {
    const list =
      missing.length === 1
        ? `${noun} ${missing[0]} non faite`
        : `${noun}s ${missing.slice(0, -1).join(", ")} et ${missing[missing.length - 1]} non faites`;
    parts.push(list);
  }

  return [head, ...parts].join(" · ");
}

// --- Adding during the session (US-32) --------------------------------------

export const MAX_ADDED_EXERCISES = 30;

// The exercises chosen in the catalog, added at the end of a block or in a
// new block. Their values are filled set by set, nothing is planned.
export const addWorkoutExercisesSchema = z.object({
  exercise_ids: z
    .array(z.number().int().positive({ error: "Exercice invalide." }))
    .min(1, { error: "Choisis au moins un exercice." })
    .max(MAX_ADDED_EXERCISES, {
      error: `${MAX_ADDED_EXERCISES} exercices au maximum.`,
    }),
});

export type AddWorkoutExercisesInput = z.output<
  typeof addWorkoutExercisesSchema
>;

// A new block during the session: a title at most, and the exercises it
// starts with.
export const addWorkoutBlockSchema = addWorkoutExercisesSchema.extend({
  name: z.string().max(160, { error: "160 caractères au maximum." }).nullable(),
});

export type AddWorkoutBlockInput = z.output<typeof addWorkoutBlockSchema>;

// "2 séries supplémentaires", "1 série supplémentaire" (B6).
export function formatAddedSets(count: number): string {
  return count > 1
    ? `${count} séries supplémentaires`
    : `${count} série supplémentaire`;
}

// How many sets of the session were added by hand (B6).
export function countAddedSets(tree: WorkoutSessionTree): number {
  return allSets(tree).filter((set) => set.is_added).length;
}

// --- Declaring a session after the fact (US-38) ---------------------------

// The plan of a past session, ready to be confirmed set by set (CAL-08b).
// The sets carry the id of the planned set they come from.
export type DeclarationPlan = {
  appointment: {
    id: number;
    planned_date: string;
    planned_time: string | null;
    session_name: string;
    program_name: string | null;
    status: AppointmentStatus;
  };
  blocks: WorkoutBlockTree[];
};

// What the screen sends back: the real date and the sets confirmed.
export const declareDoneSchema = z.object({
  actual_date: dateSchema,
  sets: z
    .array(
      z.object({
        planned_set_id: z.number().int().positive(),
        values: actualSetSchema,
      }),
    )
    .max(1000),
});

export type DeclareDoneInput = z.output<typeof declareDoneSchema>;

// "2 / 3 séries confirmées", "3 séries prévues · à vérifier", "Aucune série
// confirmée": the line under each exercise of CAL-08b.
export function describeDeclaredExercise(
  confirmed: number,
  total: number,
): string {
  if (confirmed === 0) {
    return total <= 1
      ? `${total} série prévue · à vérifier`
      : `${total} séries prévues · à vérifier`;
  }
  return `${confirmed} / ${total} séries confirmées`;
}

// The chip on the right of the same line.
export function getDeclaredExerciseState(
  confirmed: number,
  total: number,
): "done" | "partial" | "todo" {
  if (confirmed === 0) {
    return "todo";
  }
  return confirmed >= total ? "done" : "partial";
}

// What one side of a set records (US-51). The goal is the same on both
// sides: only the values done change.
export const sideSetSchema = z.object({
  reps: boundedValue(SET_LIMITS.reps),
  weight_kg: boundedValue(SET_LIMITS.weight_kg),
  duration_seconds: boundedValue(SET_LIMITS.duration_seconds),
});

export type SideSetValues = z.output<typeof sideSetSchema>;

// The address of one side: /api/workout-sets/:id/sides/:side
export const sideParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  side: z.enum(SIDES, { error: "Côté inconnu." }),
});

export function getSide(
  set: Pick<WorkoutSetRow, "sides">,
  side: SideCode,
): WorkoutSetSide | null {
  return set.sides.find((one) => one.side === side) ?? null;
}

// "Gauche : 30 s ✓", "Droite : non faite": what B5h writes above the timer.
export function formatSideState(
  set: WorkoutSetRow,
  side: SideCode,
  codes: MeasureCode[],
  isBodyweight = false,
): string {
  const done = getSide(set, side);
  if (done === null) {
    return `${SIDE_LABELS[side]} : non faite`;
  }
  const values = formatSetValues(
    {
      reps: done.reps_actual,
      weight_kg: done.weight_actual_kg,
      weight_left_kg: null,
      weight_right_kg: null,
      duration_seconds: done.duration_actual_seconds,
      distance_meters: null,
      speed_kmh: null,
      resistance: null,
      incline_percent: null,
      calories: null,
      rest_after_seconds: null,
    },
    codes,
    isBodyweight,
  );
  return `${SIDE_LABELS[side]} : ${values} ✓`;
}

// "G 15 / D 13", the two sides of a per-side set on one line (B6).
export function formatBothSides(
  set: WorkoutSetRow,
  codes: MeasureCode[],
  isBodyweight = false,
): string {
  return SIDES.map((side) => {
    const done = getSide(set, side);
    const letter = side === "left" ? "G" : "D";
    if (done === null) {
      return `${letter} non faite`;
    }
    const values = formatSetValues(
      {
        reps: done.reps_actual,
        weight_kg: done.weight_actual_kg,
        weight_left_kg: null,
        weight_right_kg: null,
        duration_seconds: done.duration_actual_seconds,
        distance_meters: null,
        speed_kmh: null,
        resistance: null,
        incline_percent: null,
        calories: null,
        rest_after_seconds: null,
      },
      codes,
      isBodyweight,
    );
    return `${letter} ${values}`;
  }).join(" / ");
}
