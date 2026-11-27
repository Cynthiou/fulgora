import type { AppointmentStatus } from "./appointment.js";
import type { MeasureCode } from "./catalog.js";
import {
  type BlockType,
  formatMinSec,
  getMeasureProfile,
  type PlannedSetValues,
} from "./session-template.js";
import { formatDistance, formatSpeed, formatWeight } from "./units.js";
import {
  isObjectiveReached,
  toActualValues,
  toPlannedValues,
  type WorkoutSessionTree,
  type WorkoutSetRow,
} from "./workout-session.js";

// The detail of a past session (US-36): what was planned and, when the
// session was started, what was really done.

export type HistoryAppointment = {
  id: number;
  planned_date: string;
  planned_time: string | null;
  status: AppointmentStatus;
  session_name: string;
  program_name: string | null;
};

// The plan of the original version, for a session never started (RM-058).
export type PlannedExercise = {
  id: number;
  name: string;
  meta: string | null;
  measure_codes: MeasureCode[];
  is_bodyweight: boolean;
  // Done side by side (US-51)
  is_per_side: boolean;
  default_rest_seconds: number | null;
  sets: PlannedSetValues[];
};

export type PlannedBlock = {
  id: number;
  block_type: BlockType;
  name: string | null;
  position: number;
  exercises: PlannedExercise[];
};

export type HistoryDetail =
  | {
      kind: "done";
      appointment: HistoryAppointment;
      workout: WorkoutSessionTree;
    }
  | {
      kind: "planned_only";
      appointment: HistoryAppointment;
      blocks: PlannedBlock[];
    };

// How many validated sets reached every planned value ("6 / 10 objectifs").
export function countReachedObjectives(sets: WorkoutSetRow[]): number {
  return sets.filter(
    (set) => set.validated_at !== null && isObjectiveReached(set),
  ).length;
}

// "8 × 60 kg", "10 rép.", "1:10", "5 km · 9 km/h": one side of a comparison.
export function formatComparisonValue(
  values: Omit<PlannedSetValues, "rest_after_seconds">,
  codes: MeasureCode[],
  isBodyweight = false,
): string {
  const format = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
  const profile = getMeasureProfile(codes, isBodyweight);
  const parts: string[] = [];

  if (profile === "weighted" || profile === "bodyweight") {
    if (values.reps !== null && values.weight_kg !== null) {
      parts.push(
        `${format.format(values.reps)} × ${formatWeight(values.weight_kg, 2)}`,
      );
    } else if (values.reps !== null) {
      parts.push(`${format.format(values.reps)} rép.`);
    } else if (values.weight_kg !== null) {
      parts.push(formatWeight(values.weight_kg, 2));
    }
  } else {
    if (values.duration_seconds !== null) {
      parts.push(formatMinSec(values.duration_seconds));
    }
    if (values.distance_meters !== null) {
      parts.push(formatDistance(values.distance_meters, 2));
    }
    if (values.speed_kmh !== null) {
      parts.push(formatSpeed(values.speed_kmh, 2));
    }
    if (values.incline_percent !== null) {
      parts.push(`${format.format(values.incline_percent)} %`);
    }
    if (values.resistance !== null) {
      parts.push(`résistance ${format.format(values.resistance)}`);
    }
    if (values.calories !== null) {
      parts.push(`${format.format(values.calories)} kcal`);
    }
  }
  return parts.length === 0 ? "—" : parts.join(" · ");
}

export function formatPlannedSide(
  set: WorkoutSetRow,
  codes: MeasureCode[],
  isBodyweight = false,
) {
  return formatComparisonValue(toPlannedValues(set), codes, isBodyweight);
}

export function formatActualSide(
  set: WorkoutSetRow,
  codes: MeasureCode[],
  isBodyweight = false,
) {
  // The comparison reads the planned shape: a per-side load is never
  // recorded on the set itself (US-51).
  return formatComparisonValue(
    {
      ...toActualValues(set),
      reps_left: null,
      reps_right: null,
      weight_left_kg: null,
      weight_right_kg: null,
    },
    codes,
    isBodyweight,
  );
}
