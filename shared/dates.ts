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

// "18:34" for a moment in time, seen from a time zone.
export function formatTimeOfDay(
  moment: Date | string,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const date = typeof moment === "string" ? new Date(moment) : moment;
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// The calendar day "YYYY-MM-DD" shifted by a number of days (negative = past).
export function addDays(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

// "2026-11-26" -> "Jeudi 26 novembre" (the home page title).
export function formatLongDate(date: string): string {
  const text = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T00:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// The calendar day shifted by whole years; 29 February lands on 28 February.
export function addYears(date: string, years: number): string {
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const target = new Date(Date.UTC(year + years, month - 1, 1));
  const lastDay = new Date(Date.UTC(year + years, month, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

// "2026-11-26" -> "2026-11".
export function toYearMonth(date: string): string {
  return date.slice(0, 7);
}

// "2026-11" shifted by a number of months: +1 -> "2026-12", +2 -> "2027-01".
export function shiftMonth(yearMonth: string, months: number): string {
  const [year, month] = yearMonth.split("-").map(Number) as [number, number];
  const shifted = new Date(Date.UTC(year, month - 1 + months, 1));
  return shifted.toISOString().slice(0, 7);
}

// "2026-11" -> "Novembre 2026" (the title of a calendar month).
export function formatMonthTitle(yearMonth: string): string {
  const text = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${yearMonth}-01T00:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Monday-first weekday initials for the header of a calendar grid.
export const WEEKDAY_INITIALS = ["L", "M", "M", "J", "V", "S", "D"];

// The same days written in full: the initials repeat (M, M), the names do
// not, so they name the columns and key the cells of the grid.
export const WEEKDAY_NAMES = [
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
  "dimanche",
];

// The weeks of a month, Monday first, as "YYYY-MM-DD" cells; null fills the
// days that belong to the previous or the next month.
export function listMonthGrid(yearMonth: string): (string | null)[][] {
  const [year, month] = yearMonth.split("-").map(Number) as [number, number];
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  // getUTCDay: 0 = Sunday; we want Monday = 0 ... Sunday = 6
  const firstWeekday =
    (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;

  const cells: (string | null)[] = Array.from(
    { length: firstWeekday },
    () => null,
  );
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${yearMonth}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: (string | null)[][] = [];
  for (let start = 0; start < cells.length; start += 7) {
    weeks.push(cells.slice(start, start + 7));
  }
  return weeks;
}

// One cell of the month grid: a day, or an empty box before the first day
// and after the last one. Every cell carries its own key, so the grid never
// keys a cell by its position in the list.
export type MonthSlot = { key: string; day: string | null };

export function listMonthWeeks(yearMonth: string): MonthSlot[][] {
  return listMonthGrid(yearMonth).map((week, weekIndex) =>
    week.map((day, dayIndex) => ({
      key:
        day ?? `${yearMonth}-semaine-${weekIndex}-${WEEKDAY_NAMES[dayIndex]}`,
      day,
    })),
  );
}

// A moment in time -> "25 novembre à 21:12", seen from a time zone
// ("Annulée le 25 novembre à 21:12", CAL-07c).
export function formatDayTime(
  moment: string,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const date = new Date(moment);
  const day = new Intl.DateTimeFormat("fr-FR", {
    timeZone,
    day: "numeric",
    month: "long",
  }).format(date);
  return `${day} à ${formatTimeOfDay(date, timeZone)}`;
}

// "2026-11-19" -> "19 novembre" (inside a sentence, "prévue le 19 novembre").
export function formatDayMonth(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T00:00:00Z`));
}

// "2026-11-28" -> "Séance le samedi 28 novembre" (the date picker, A2b).
export function formatSessionDate(date: string): string {
  const long = formatLongDate(date);
  return `Séance le ${long.charAt(0).toLowerCase()}${long.slice(1)}`;
}
