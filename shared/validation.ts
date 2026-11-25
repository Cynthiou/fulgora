// Validation rules shared by the client and the server.
// The server uses them to refuse bad data, the client to show messages.
import * as z from "zod";

// Zod messages in French, displayable as is.
z.config(z.locales.fr());

// One field in error, as sent back by the server.
export type ValidationField = {
  field: string;
  message: string;
};

// An identifier in an address (/exercises/:id) arrives as text.
// Digits only, no leading zero, then turned into a number.
export const idSchema = z
  .string()
  .regex(/^[1-9]\d*$/, { error: "Identifiant invalide." })
  .transform(Number);

export const idParamSchema = z.object({ id: idSchema });

// "2026-02-30" has the right shape but is not a real day.
function isRealDate(text: string): boolean {
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const DATE_MESSAGE = "Date invalide (format AAAA-MM-JJ).";

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: DATE_MESSAGE })
  .refine(isRealDate, { error: DATE_MESSAGE });

export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
  error: "Heure invalide (format HH:MM).",
});

// Removes spaces at both ends of every string, however deep it sits.
// Numbers, booleans and null are returned unchanged.
export function trimStrings<T>(value: T): T {
  if (typeof value === "string") {
    return value.trim() as T;
  }
  if (Array.isArray(value)) {
    return value.map(trimStrings) as T;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value).map(([key, item]) => [
      key,
      trimStrings(item),
    ]);
    return Object.fromEntries(entries) as T;
  }
  return value;
}
