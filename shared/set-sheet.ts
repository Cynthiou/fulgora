import type { MeasureCode } from "./catalog.js";
import {
  getMeasureProfile,
  getSetFields,
  type MeasureProfile,
  type PlannedSetValues,
  type SetValueField,
} from "./session-template.js";
import {
  DISTANCE_UNIT_LABELS,
  fromDisplayDistance,
  fromDisplaySpeed,
  fromDisplayWeight,
  getDisplayUnits,
  getSpeedUnitLabel,
  toDisplayDistance,
  toDisplaySpeed,
  toDisplayWeight,
  WEIGHT_UNIT_LABELS,
} from "./units.js";

// What the sheet of the sets edits (handoff des séries, étape 4). The
// screen works on "lines": one line is n sets that carry the same values,
// which is how the user thinks ("4 séries de 10 à 60 kg"). The draft keeps
// storing one row per set, so the two shapes are converted here.

// --- Lines of sets ---------------------------------------------------------

export type SetLine = {
  // How many sets this line stands for ("4 séries", cardio "4 tours")
  count: number;
  values: PlannedSetValues;
};

function sameValues(a: PlannedSetValues, b: PlannedSetValues): boolean {
  return (Object.keys(a) as (keyof PlannedSetValues)[]).every(
    (key) => a[key] === b[key],
  );
}

// Groups the sets that follow each other and carry the same values.
export function toSetLines(sets: PlannedSetValues[]): SetLine[] {
  const lines: SetLine[] = [];
  for (const set of sets) {
    const last = lines[lines.length - 1];
    if (last !== undefined && sameValues(last.values, set)) {
      last.count += 1;
    } else {
      lines.push({ count: 1, values: { ...set } });
    }
  }
  return lines;
}

// Back to one row per set: a line of 4 gives 4 sets of the same values.
export function fromSetLines(lines: SetLine[]): PlannedSetValues[] {
  return lines.flatMap((line) =>
    Array.from({ length: Math.max(1, line.count) }, () => ({ ...line.values })),
  );
}

// --- The cases of the sheet ------------------------------------------------

// "count" is the number of sets of the line, the first case of the sheet;
// the others are the values of one set.
export type SetMeasureKey = "count" | SetValueField;

// Which goals a per-side exercise asks apart (handoff "Gauche ≠ droite").
export type SideSplit = { reps: boolean; weight: boolean };

export const NO_SPLIT: SideSplit = { reps: false, weight: false };

export type SetMeasure = {
  key: SetMeasureKey;
  // The cyan label above the case: "RÉPÉTITIONS", "CHARGE GAUCHE"
  head: string;
  // The unit written after the number, agreeing with it: "série", "séries"
  unit: (value: number | null) => string;
  // What − and + add, in the unit shown on screen
  step: number;
  // How low − goes
  min: number;
  // How many decimals the value may show
  decimals: number;
  // Stored to shown, and back (DT-11: kg and meters are stored)
  toDisplay: (stored: number) => number;
  fromDisplay: (shown: number) => number;
  // A case that may stay empty without holding "Enregistrer" back: the
  // added weight of a body weight exercise, the distance and the
  // calories of a cardio machine.
  isOptional?: boolean;
};

const SAME = {
  toDisplay: (value: number) => value,
  fromDisplay: (value: number) => value,
};

// Seconds are stored; a cardio stage is read in minutes (handoff 2.1).
const MINUTES = {
  toDisplay: (seconds: number) => seconds / 60,
  fromDisplay: (minutes: number) => Math.round(minutes * 60),
};

const plural = (value: number | null, one: string, many: string) =>
  value !== null && value > 1 ? many : one;

// One case of the sheet, with everything the screen needs to draw it and
// to step it. The steps and the minimums are those of the handoff.
function describeMeasure(
  key: SetMeasureKey,
  profile: MeasureProfile,
  isPerSide: boolean,
): SetMeasure {
  const isCardio = profile === "cardio";
  const weightUnit = WEIGHT_UNIT_LABELS[getDisplayUnits().weight];
  const weight = {
    unit: () => weightUnit,
    decimals: 1,
    toDisplay: toDisplayWeight,
    fromDisplay: fromDisplayWeight,
  };

  switch (key) {
    case "count":
      return {
        key,
        head: isCardio ? "NOMBRE DE TOURS" : "SÉRIES",
        unit: (value) =>
          isCardio
            ? plural(value, "tour", "tours")
            : plural(value, "série", "séries"),
        step: 1,
        min: 1,
        decimals: 0,
        ...SAME,
      };
    case "reps":
      return {
        key,
        head: isPerSide ? "RÉPÉTITIONS PAR CÔTÉ" : "RÉPÉTITIONS",
        unit: () => (isPerSide ? "rép. / côté" : "rép."),
        step: 1,
        min: 1,
        decimals: 0,
        ...SAME,
      };
    case "reps_left":
    case "reps_right":
      return {
        key,
        head: key === "reps_left" ? "RÉP. GAUCHE" : "RÉP. DROITE",
        unit: () => "rép.",
        step: 1,
        min: 0,
        decimals: 0,
        ...SAME,
      };
    case "weight_kg":
      return {
        key,
        head: profile === "bodyweight" ? "LEST" : "CHARGE",
        // A plate weighs 2,5 kg, or 5 lb for a user who reads pounds
        step: getDisplayUnits().weight === "kg" ? 2.5 : 5,
        min: 0,
        // A pull-up without any added weight is a complete goal (A7b)
        isOptional: profile === "bodyweight",
        ...weight,
      };
    case "weight_left_kg":
    case "weight_right_kg":
      return {
        key,
        head: key === "weight_left_kg" ? "CHARGE GAUCHE" : "CHARGE DROITE",
        // One side at a time moves by smaller amounts (handoff)
        step: getDisplayUnits().weight === "kg" ? 1 : 2.5,
        min: 0,
        ...weight,
      };
    case "duration_seconds":
      return isCardio
        ? {
            key,
            head: "DURÉE",
            unit: () => "min",
            step: 1,
            min: 1,
            decimals: 0,
            ...MINUTES,
          }
        : {
            key,
            head: "DURÉE",
            unit: () => "s",
            step: 5,
            min: 5,
            decimals: 0,
            ...SAME,
          };
    case "distance_meters":
      return {
        key,
        head: "DISTANCE",
        unit: () => DISTANCE_UNIT_LABELS[getDisplayUnits().distance],
        step: 0.1,
        min: 0,
        decimals: 2,
        toDisplay: toDisplayDistance,
        fromDisplay: fromDisplayDistance,
      };
    case "speed_kmh":
      return {
        key,
        head: "VITESSE",
        unit: () => getSpeedUnitLabel(),
        step: 0.5,
        min: 0,
        decimals: 1,
        toDisplay: toDisplaySpeed,
        fromDisplay: fromDisplaySpeed,
      };
    case "incline_percent":
      return {
        key,
        head: "INCLINAISON",
        unit: () => "%",
        step: 0.5,
        min: 0,
        decimals: 1,
        ...SAME,
      };
    case "resistance":
      return {
        key,
        head: "RÉSISTANCE",
        unit: () => "",
        step: 1,
        min: 0,
        decimals: 0,
        ...SAME,
      };
    case "calories":
      return {
        key,
        head: "CALORIES",
        unit: () => "kcal",
        step: 10,
        min: 0,
        decimals: 0,
        ...SAME,
      };
  }
}

// A cardio machine asks for the duration, the speed and the incline; its
// distance and its calories are offered apart ("Modifier" of the handoff).
export const OPTIONAL_CARDIO_FIELDS: SetValueField[] = [
  "distance_meters",
  "calories",
];

type MeasuresInput = {
  measure_codes: MeasureCode[];
  is_bodyweight?: boolean;
  is_per_side?: boolean;
};

// The cases of the sheet, in the order of the handoff: the number of sets
// first, then one case per measure of the exercise. A per-side exercise
// splits its repetitions, its load, or both.
export function getSetMeasures(
  exercise: MeasuresInput,
  split: SideSplit = NO_SPLIT,
  // The optional measures of a cardio machine the user turned on
  extraFields: SetValueField[] = [],
): SetMeasure[] {
  const codes = exercise.measure_codes;
  const isBodyweight = exercise.is_bodyweight ?? false;
  const isPerSide = exercise.is_per_side ?? false;
  const profile = getMeasureProfile(codes, isBodyweight);
  const isCardio = profile === "cardio";

  const keys: SetMeasureKey[] = ["count"];
  for (const field of getSetFields(codes, isBodyweight)) {
    // A cardio machine hides its distance and its calories until asked
    if (
      isCardio &&
      OPTIONAL_CARDIO_FIELDS.includes(field) &&
      !extraFields.includes(field)
    ) {
      continue;
    }
    if (field === "reps" && isPerSide && split.reps) {
      keys.push("reps_left", "reps_right");
    } else if (field === "weight_kg" && isPerSide && split.weight) {
      keys.push("weight_left_kg", "weight_right_kg");
    } else {
      keys.push(field);
    }
  }
  return keys.map((key) => {
    const measure = describeMeasure(key, profile, isPerSide);
    return OPTIONAL_CARDIO_FIELDS.includes(key as SetValueField)
      ? { ...measure, isOptional: true }
      : measure;
  });
}

// Which sides a line already carries apart, so the sheet opens on the
// state the user left (the two counts, the two loads, or neither).
export function readSideSplit(values: PlannedSetValues): SideSplit {
  return {
    reps: values.reps_left !== null || values.reps_right !== null,
    weight: values.weight_left_kg !== null || values.weight_right_kg !== null,
  };
}

// Moves a value of a case by one step, never below its minimum. Works in
// the unit shown on screen and gives back what must be stored.
export function stepMeasure(
  measure: SetMeasure,
  stored: number | null,
  direction: 1 | -1,
): number {
  const shown = stored === null ? measure.min : measure.toDisplay(stored);
  const next = Math.max(measure.min, shown + direction * measure.step);
  // 0,1 + 0,2 must stay 0,3: the step never has more than two decimals.
  return measure.fromDisplay(Math.round(next * 100) / 100);
}

// The value of a case, as the user reads it: "62,5", "10", or null when
// the case is empty (the sheet then writes a dash).
export function readMeasure(
  measure: SetMeasure,
  values: PlannedSetValues,
): number | null {
  if (measure.key === "count") {
    return null;
  }
  const stored = values[measure.key];
  return stored === null ? null : measure.toDisplay(stored);
}

// The value a case writes back into the line, in the stored unit.
export function writeMeasure(
  measure: SetMeasure,
  shown: number | null,
): number | null {
  return shown === null ? null : measure.fromDisplay(shown);
}
