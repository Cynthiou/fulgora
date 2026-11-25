import * as z from "zod";
import type { AppointmentStatus, WorkoutStatus } from "./appointment.js";
import type { MeasureCode } from "./catalog.js";
import type { BlockType, PlannedSetValues } from "./session-template.js";

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
  session_name: string;
  program_name: string | null;
  // The realized session, when the appointment was started
  workout_session: { id: number; status: WorkoutStatus } | null;
  blocks: {
    id: number;
    block_type: BlockType;
    name: string | null;
    position: number;
    exercises: { id: number; exercise_id: number; name: string }[];
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
};

export type WorkoutExerciseTree = {
  id: number;
  exercise_id: number;
  position: number;
  name: string;
  // "Pectoraux · Barre"
  meta: string | null;
  measure_codes: MeasureCode[];
  default_rest_seconds: number | null;
  sets: WorkoutSetRow[];
};

export type WorkoutBlockTree = {
  id: number;
  block_type: BlockType;
  name: string | null;
  position: number;
  instructions: string | null;
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
  blocks: WorkoutBlockTree[];
};

// --- Helpers -------------------------------------------------------------------

// The planned side of a set, in the shape of the editor (for the summaries).
export function toPlannedValues(set: WorkoutSetRow): PlannedSetValues {
  return {
    reps: set.reps_planned,
    weight_kg: set.weight_planned_kg,
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
