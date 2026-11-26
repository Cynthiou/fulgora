// DT-11: the database always keeps kilograms, meters, seconds and km/h.
// Only the screens change: a user may read pounds and miles (US-05).

export const WEIGHT_UNITS = ["kg", "lb"] as const;
export const DISTANCE_UNITS = ["km", "mi"] as const;

export type WeightUnit = (typeof WEIGHT_UNITS)[number];
export type DistanceUnit = (typeof DISTANCE_UNITS)[number];

export const WEIGHT_UNIT_LABELS: Record<WeightUnit, string> = {
  kg: "kg",
  lb: "lb",
};

export const DISTANCE_UNIT_LABELS: Record<DistanceUnit, string> = {
  km: "km",
  mi: "mi",
};

// The exact factors, so that a round trip gives the value back.
const KILOGRAMS_PER_POUND = 0.45359237;
const METERS_PER_MILE = 1609.344;
const METERS_PER_KILOMETER = 1000;

// Rounded to three decimals: a load is never finer than a gram, and it
// keeps 135 lb -> 61,235 kg -> 135 lb (US-05).
function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// 60 kg -> 132,277 lb. The screen rounds again when it prints it.
export function toDisplayWeight(
  kilograms: number,
  unit: WeightUnit = getDisplayUnits().weight,
): number {
  return unit === "kg" ? kilograms : round(kilograms / KILOGRAMS_PER_POUND, 3);
}

// 135 lb -> 61,235 kg, what is stored.
export function fromDisplayWeight(
  value: number,
  unit: WeightUnit = getDisplayUnits().weight,
): number {
  return unit === "kg" ? value : round(value * KILOGRAMS_PER_POUND, 3);
}

// 5 200 m -> 5,2 km or 3,231 mi.
export function toDisplayDistance(
  meters: number,
  unit: DistanceUnit = getDisplayUnits().distance,
): number {
  return round(
    meters / (unit === "km" ? METERS_PER_KILOMETER : METERS_PER_MILE),
    3,
  );
}

// 3,231 mi -> 5 200 m, what is stored.
export function fromDisplayDistance(
  value: number,
  unit: DistanceUnit = getDisplayUnits().distance,
): number {
  return round(
    value * (unit === "km" ? METERS_PER_KILOMETER : METERS_PER_MILE),
    3,
  );
}

// A speed follows the distance: km/h or mph. Stored in km/h (DT-11).
export function toDisplaySpeed(
  kilometersPerHour: number,
  unit: DistanceUnit = getDisplayUnits().distance,
): number {
  return unit === "km"
    ? kilometersPerHour
    : round((kilometersPerHour * METERS_PER_KILOMETER) / METERS_PER_MILE, 3);
}

export function fromDisplaySpeed(
  value: number,
  unit: DistanceUnit = getDisplayUnits().distance,
): number {
  return unit === "km"
    ? value
    : round((value * METERS_PER_MILE) / METERS_PER_KILOMETER, 3);
}

export function getSpeedUnitLabel(
  unit: DistanceUnit = getDisplayUnits().distance,
): string {
  return unit === "km" ? "km/h" : "mph";
}

// The units of the screens. The server never changes them: it answers in
// the stored units, and the client sets them once the user is known.
export type DisplayUnits = {
  weight: WeightUnit;
  distance: DistanceUnit;
};

let displayUnits: DisplayUnits = { weight: "kg", distance: "km" };

export function setDisplayUnits(next: DisplayUnits): void {
  displayUnits = next;
}

export function getDisplayUnits(): DisplayUnits {
  return displayUnits;
}

// Two decimals on a set sheet, one on a summary: each screen says how
// fine it prints (the stored value never changes).
function format(value: number, decimals: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: decimals,
  }).format(value);
}

// "60 kg" or "132,3 lb": a load, in the unit chosen by the user.
export function formatWeight(kilograms: number, decimals = 1): string {
  const { weight } = getDisplayUnits();
  return `${format(toDisplayWeight(kilograms, weight), decimals)} ${
    WEIGHT_UNIT_LABELS[weight]
  }`;
}

// "5,2 km" or "3,2 mi": a distance, from the stored meters.
export function formatDistance(meters: number, decimals = 1): string {
  const { distance } = getDisplayUnits();
  return `${format(toDisplayDistance(meters, distance), decimals)} ${
    DISTANCE_UNIT_LABELS[distance]
  }`;
}

// "9 km/h" or "5,6 mph".
export function formatSpeed(kilometersPerHour: number, decimals = 1): string {
  const { distance } = getDisplayUnits();
  return `${format(
    toDisplaySpeed(kilometersPerHour, distance),
    decimals,
  )} ${getSpeedUnitLabel(distance)}`;
}
