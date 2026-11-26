import * as z from "zod";
import {
  DISTANCE_UNITS,
  type DistanceUnit,
  formatDistance,
  formatWeight,
  WEIGHT_UNITS,
  type WeightUnit,
} from "./units.js";

// US-05: the preferences of one user (RM-005). Each one applies at once.

// D-04: the three indicators of the home page. "Aucun" is a real choice,
// it is not the same as "not chosen yet".
export const HOME_METRICS = ["sessions_week", "time_week", "none"] as const;

export type HomeMetric = (typeof HOME_METRICS)[number];

export const HOME_METRIC_LABELS: Record<HomeMetric, string> = {
  sessions_week: "Séances faites cette semaine",
  time_week: "Temps d'entraînement de la semaine",
  none: "Aucun",
};

export type UserPreferences = {
  weight_unit: WeightUnit;
  distance_unit: DistanceUnit;
  home_metric: HomeMetric;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  timer_notification_enabled: boolean;
};

// The values of a brand new account, the same as the columns of the table.
export const DEFAULT_PREFERENCES: UserPreferences = {
  weight_unit: "kg",
  distance_unit: "km",
  home_metric: "sessions_week",
  sound_enabled: true,
  vibration_enabled: true,
  timer_notification_enabled: false,
};

// PATCH: one preference or several, never an unknown one. strict() turns
// any other field into a 400, and at least one field is required.
export const preferencesSchema = z
  .object({
    weight_unit: z.enum(WEIGHT_UNITS),
    distance_unit: z.enum(DISTANCE_UNITS),
    home_metric: z.enum(HOME_METRICS),
    sound_enabled: z.boolean(),
    vibration_enabled: z.boolean(),
    timer_notification_enabled: z.boolean(),
  })
  .partial()
  .strict()
  .refine((values) => Object.keys(values).length > 0, {
    error: "Aucune préférence à enregistrer.",
  });

export type UpdatePreferencesInput = z.output<typeof preferencesSchema>;

// The APERÇU card of PRF-03: the same three lines as the mockup, in the
// units being chosen. The figures are examples, not real data.
export const PREVIEW_WEIGHT_KG = 60;
export const PREVIEW_DISTANCE_METERS = 5200;

export function formatPreferencesPreview(
  preferences: UserPreferences,
): { label: string; value: string }[] {
  const homeValue: Record<HomeMetric, string> = {
    sessions_week: "2 séances faites",
    time_week: "3 h 10 d'entraînement",
    none: "Aucun indicateur",
  };
  return [
    {
      label: "Squat à la barre",
      value: `4 × 8 · ${formatWeight(PREVIEW_WEIGHT_KG)}`,
    },
    {
      label: "Tapis de course",
      value: formatDistance(PREVIEW_DISTANCE_METERS),
    },
    { label: "Accueil", value: homeValue[preferences.home_metric] },
  ];
}
