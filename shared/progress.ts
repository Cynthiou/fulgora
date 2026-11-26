import type { MeasureCode } from "./catalog.js";
import { formatDayMonth } from "./dates.js";
import {
  formatDuration,
  getMeasureProfile,
  type MeasureProfile,
} from "./session-template.js";

// US-39: how an exercise has gone, session after session. Everything is
// computed from the sets really done (RM-051), never stored.

// One set done on one day, as the server hands it over.
export type ProgressSet = {
  // The real day of the session ("2026-11-19")
  date: string;
  // The session was given up: its point is drawn dotted (RM-081)
  is_partial: boolean;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  speed_kmh: number | null;
};

export const PROGRESS_METRICS = [
  "weight_max",
  "one_rep_max",
  "reps_max",
  "duration_max",
  "distance",
  "duration",
  "speed",
] as const;

export type ProgressMetric = (typeof PROGRESS_METRICS)[number];

export const PROGRESS_METRIC_LABELS: Record<ProgressMetric, string> = {
  weight_max: "Charge max",
  one_rep_max: "1RM estimée",
  reps_max: "Répétitions max",
  duration_max: "Durée max",
  distance: "Distance",
  duration: "Durée",
  speed: "Vitesse",
};

// The 1RM of Epley: weight × (1 + reps / 30). Only on a set of 10
// repetitions or less, where the formula stays honest (RM-079).
export function estimateOneRepMax(
  weightKg: number | null,
  reps: number | null,
): number | null {
  if (weightKg === null || reps === null || reps < 1 || reps > 10) {
    return null;
  }
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

// The measures the sets actually hold: nothing else is offered (US-39).
export function getAvailableMetrics(
  sets: ProgressSet[],
  profile: MeasureProfile,
): ProgressMetric[] {
  const metrics: ProgressMetric[] = [];
  const has = (pick: (set: ProgressSet) => number | null) =>
    sets.some((set) => pick(set) !== null);

  if (profile === "cardio") {
    if (has((set) => set.distance_meters)) {
      metrics.push("distance");
    }
    if (has((set) => set.duration_seconds)) {
      metrics.push("duration");
    }
    if (has((set) => set.speed_kmh)) {
      metrics.push("speed");
    }
    return metrics;
  }
  if (has((set) => set.weight_kg)) {
    metrics.push("weight_max");
    // The estimate needs a set of 10 repetitions or less (RM-079).
    if (
      sets.some((set) => estimateOneRepMax(set.weight_kg, set.reps) !== null)
    ) {
      metrics.push("one_rep_max");
    }
  }
  if (has((set) => set.reps)) {
    metrics.push("reps_max");
  }
  if (has((set) => set.duration_seconds)) {
    metrics.push(profile === "duration" ? "duration_max" : "duration");
  }
  return metrics;
}

export type ProgressPoint = {
  date: string;
  value: number;
  // Session given up: the point is drawn dotted (RM-081)
  is_partial: boolean;
};

// The value one set gives for the chosen measure, or null when it says
// nothing about it.
function valueOf(set: ProgressSet, metric: ProgressMetric): number | null {
  switch (metric) {
    case "weight_max":
      return set.weight_kg;
    case "one_rep_max":
      return estimateOneRepMax(set.weight_kg, set.reps);
    case "reps_max":
      return set.reps;
    case "duration_max":
    case "duration":
      return set.duration_seconds;
    case "distance":
      return set.distance_meters;
    case "speed":
      return set.speed_kmh;
    default:
      return null;
  }
}

// One point per session: the best value of the day (RM-081). A session
// without any usable value gives no point at all.
export function buildProgressSeries(
  sets: ProgressSet[],
  metric: ProgressMetric,
): ProgressPoint[] {
  const byDate = new Map<string, ProgressPoint>();
  for (const set of sets) {
    const value = valueOf(set, metric);
    if (value === null) {
      continue;
    }
    const current = byDate.get(set.date);
    if (current === undefined) {
      byDate.set(set.date, {
        date: set.date,
        value,
        is_partial: set.is_partial,
      });
      continue;
    }
    byDate.set(set.date, {
      date: set.date,
      value: Math.max(current.value, value),
      is_partial: current.is_partial && set.is_partial,
    });
  }
  return [...byDate.values()].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
}

export type ExerciseRecords = {
  // The heaviest set, with the repetitions that went with it
  weight_max: { weight_kg: number; reps: number | null } | null;
  one_rep_max: number | null;
  // "8 × 62,5 = 500 kg"
  best_set_volume: { reps: number; weight_kg: number; volume: number } | null;
  best_session_volume: number | null;
  max_reps: number | null;
  max_duration_seconds: number | null;
  max_distance_meters: number | null;
  session_count: number;
};

// The blocks of records of SUI-09, all computed from the sets (RM-051).
export function computeExerciseRecords(sets: ProgressSet[]): ExerciseRecords {
  const records: ExerciseRecords = {
    weight_max: null,
    one_rep_max: null,
    best_set_volume: null,
    best_session_volume: null,
    max_reps: null,
    max_duration_seconds: null,
    max_distance_meters: null,
    session_count: new Set(sets.map((set) => set.date)).size,
  };
  const volumeByDate = new Map<string, number>();

  for (const set of sets) {
    if (
      set.weight_kg !== null &&
      (records.weight_max === null ||
        set.weight_kg > records.weight_max.weight_kg)
    ) {
      records.weight_max = { weight_kg: set.weight_kg, reps: set.reps };
    }
    const estimate = estimateOneRepMax(set.weight_kg, set.reps);
    if (
      estimate !== null &&
      (records.one_rep_max === null || estimate > records.one_rep_max)
    ) {
      records.one_rep_max = estimate;
    }
    if (set.reps !== null && set.weight_kg !== null) {
      const volume = Math.round(set.reps * set.weight_kg * 100) / 100;
      // On a tie, the most recent set wins: "8 × 62,5" rather than the
      // older "10 × 50" of the same volume (SUI-09).
      if (
        records.best_set_volume === null ||
        volume >= records.best_set_volume.volume
      ) {
        records.best_set_volume = {
          reps: set.reps,
          weight_kg: set.weight_kg,
          volume,
        };
      }
      volumeByDate.set(set.date, (volumeByDate.get(set.date) ?? 0) + volume);
    }
    if (
      set.reps !== null &&
      (records.max_reps === null || set.reps > records.max_reps)
    ) {
      records.max_reps = set.reps;
    }
    if (
      set.duration_seconds !== null &&
      (records.max_duration_seconds === null ||
        set.duration_seconds > records.max_duration_seconds)
    ) {
      records.max_duration_seconds = set.duration_seconds;
    }
    if (
      set.distance_meters !== null &&
      (records.max_distance_meters === null ||
        set.distance_meters > records.max_distance_meters)
    ) {
      records.max_distance_meters = set.distance_meters;
    }
  }

  const volumes = [...volumeByDate.values()];
  records.best_session_volume =
    volumes.length === 0 ? null : Math.max(...volumes);
  return records;
}

const numberFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
});

// "62,5 kg", "8 rép.", "1 min 30", "5 km", "9 km/h": one value of a curve.
export function formatMetricValue(
  metric: ProgressMetric,
  value: number,
): string {
  switch (metric) {
    case "weight_max":
    case "one_rep_max":
      return `${numberFormat.format(value)} kg`;
    case "reps_max":
      return `${numberFormat.format(value)} rép.`;
    case "duration_max":
    case "duration":
      return formatDuration(value);
    case "distance":
      return `${numberFormat.format(value / 1000)} km`;
    case "speed":
      return `${numberFormat.format(value)} km/h`;
    default:
      return numberFormat.format(value);
  }
}

// "De 50 kg à 62,5 kg en 2 séances" (SUI-09); null below two points.
export function formatProgressTrend(
  points: ProgressPoint[],
  metric: ProgressMetric,
): string | null {
  const first = points[0];
  const last = points[points.length - 1];
  if (first === undefined || last === undefined || points.length < 2) {
    return null;
  }
  return `De ${formatMetricValue(metric, first.value)} à ${formatMetricValue(
    metric,
    last.value,
  )} en ${points.length} séances`;
}

// The same curve, said in words for a screen reader (US-39, DoD).
export function describeProgressSeries(
  points: ProgressPoint[],
  metric: ProgressMetric,
): string {
  if (points.length === 0) {
    return "Aucun point à afficher.";
  }
  return points
    .map(
      (point) =>
        `${formatDayMonth(point.date)} : ${formatMetricValue(
          metric,
          point.value,
        )}${point.is_partial ? " (séance inachevée)" : ""}`,
    )
    .join(" · ");
}

// --- What the API answers --------------------------------------------------

export type ProgressExerciseItem = {
  exercise_id: number;
  name: string;
  meta: string | null;
  measure_codes: MeasureCode[];
  is_bodyweight: boolean;
  // The day of the last session holding this exercise
  last_date: string;
  session_count: number;
  // "62,5 kg × 8", the best result, ready to print
  best: string | null;
};

export type ExerciseProgress = {
  exercise_id: number;
  name: string;
  meta: string | null;
  measure_codes: MeasureCode[];
  is_bodyweight: boolean;
  sets: ProgressSet[];
};

// "62,5 kg × 8", "12 rép.", "1 min 30", "5 km": the best of an exercise on
// the list of SUI-08.
export function formatBestResult(
  sets: ProgressSet[],
  codes: MeasureCode[],
  isBodyweight = false,
): string | null {
  const profile = getMeasureProfile(codes, isBodyweight);
  const records = computeExerciseRecords(sets);
  if (records.weight_max !== null && profile !== "cardio") {
    const reps = records.weight_max.reps;
    return `${numberFormat.format(records.weight_max.weight_kg)} kg${
      reps === null ? "" : ` × ${reps}`
    }`;
  }
  if (records.max_reps !== null && profile !== "cardio") {
    return `${records.max_reps} rép.`;
  }
  if (records.max_distance_meters !== null) {
    return `${numberFormat.format(records.max_distance_meters / 1000)} km`;
  }
  if (records.max_duration_seconds !== null) {
    return formatDuration(records.max_duration_seconds);
  }
  return null;
}

// --- New records (US-40) ---------------------------------------------------

// The measures a record can be set on, in the order the notification
// writes them.
export type RecordKind =
  | "weight_max"
  | "reps_max"
  | "duration_max"
  | "distance_max";

export const RECORD_LABELS: Record<RecordKind, string> = {
  weight_max: "Charge max",
  reps_max: "Répétitions max",
  duration_max: "Durée max",
  distance_max: "Distance max",
};

export type NewRecord = {
  kind: RecordKind;
  // "62,5 kg × 8", "12 rép.", "1 min 10", "5,2 km"
  text: string;
};

// What the best of a list of sets is worth, measure by measure.
function bestOf(sets: ProgressSet[]) {
  const records = computeExerciseRecords(sets);
  return {
    weight_max: records.weight_max?.weight_kg ?? null,
    reps_max: records.max_reps,
    duration_max: records.max_duration_seconds,
    distance_max: records.max_distance_meters,
  };
}

// The records the session has just set: strictly better than everything
// done before (RM-080). Nothing on the very first session: there is no
// "before" to beat.
export function detectNewRecords(
  previousSets: ProgressSet[],
  sessionSets: ProgressSet[],
  profile: MeasureProfile,
): NewRecord[] {
  if (previousSets.length === 0 || sessionSets.length === 0) {
    return [];
  }
  const before = bestOf(previousSets);
  const now = bestOf(sessionSets);
  const session = computeExerciseRecords(sessionSets);
  const records: NewRecord[] = [];

  if (
    profile !== "cardio" &&
    now.weight_max !== null &&
    (before.weight_max === null || now.weight_max > before.weight_max)
  ) {
    const reps = session.weight_max?.reps ?? null;
    records.push({
      kind: "weight_max",
      text: `${numberFormat.format(now.weight_max)} kg${
        reps === null ? "" : ` × ${reps}`
      }`,
    });
  }
  if (
    profile !== "cardio" &&
    now.weight_max === null &&
    now.reps_max !== null &&
    (before.reps_max === null || now.reps_max > before.reps_max)
  ) {
    records.push({
      kind: "reps_max",
      text: `${numberFormat.format(now.reps_max)} rép.`,
    });
  }
  if (
    profile === "duration" &&
    now.duration_max !== null &&
    (before.duration_max === null || now.duration_max > before.duration_max)
  ) {
    records.push({
      kind: "duration_max",
      text: formatDuration(now.duration_max),
    });
  }
  if (
    profile === "cardio" &&
    now.distance_max !== null &&
    (before.distance_max === null || now.distance_max > before.distance_max)
  ) {
    records.push({
      kind: "distance_max",
      text: `${numberFormat.format(now.distance_max / 1000)} km`,
    });
  }
  return records;
}

// "Charge max : 62,5 kg × 8": the message of the notification (NOT-06).
export function formatRecordMessage(record: NewRecord): string {
  return `${RECORD_LABELS[record.kind]} : ${record.text}`;
}
