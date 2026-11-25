// "Today" depends on where the user is: at 23:30 in Paris, UTC already says
// tomorrow. The server always computes dates in the user's time zone and
// passes them as SQL parameters, never with CURRENT_DATE (common rule 7).
export const DEFAULT_TIMEZONE = "Europe/Paris";

// The calendar day of "now" in a time zone, as "YYYY-MM-DD".
export function todayIn(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${read("year")}-${read("month")}-${read("day")}`;
}

export function todayInParis(now: Date = new Date()): string {
  return todayIn(DEFAULT_TIMEZONE, now);
}
