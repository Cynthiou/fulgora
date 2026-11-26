import * as z from "zod";
import type { UserPreferences } from "./preferences.js";

// The user as the client sees it. Never the password hash.
export type Sex = "female" | "male";

export type PublicUser = {
  id: number;
  username: string;
  email: string;
  sex: Sex | null;
  // The units, the alerts and the home indicator (US-05, RM-005)
  preferences: UserPreferences;
};

// Messages shown under the fields, as written in the US-01 card.
export const REQUIRED_MESSAGE = "Ce champ est obligatoire.";
export const USERNAME_MESSAGE =
  "3 à 30 caractères : lettres, chiffres, point, tiret ou tiret bas.";
export const EMAIL_MESSAGE = "Adresse e-mail invalide.";
export const PASSWORD_MESSAGE = "8 caractères minimum, dont un chiffre.";
export const PASSWORD_MAX_MESSAGE = "128 caractères maximum.";
export const TERMS_MESSAGE =
  "Tu dois accepter les conditions pour créer ton compte.";

// A non-empty string. Checked first, so an empty field gets one single
// message ("Ce champ est obligatoire.") instead of every rule at once.
const requiredString = z.string({ error: REQUIRED_MESSAGE }).min(1, {
  error: REQUIRED_MESSAGE,
});

export const usernameSchema = requiredString.pipe(
  z.string().regex(/^[A-Za-z0-9._-]{3,30}$/, { error: USERNAME_MESSAGE }),
);

// Stored in lowercase: Lea@Mail.fr and lea@mail.fr are the same account.
export const emailSchema = requiredString
  .pipe(z.email({ error: EMAIL_MESSAGE }).max(254, { error: EMAIL_MESSAGE }))
  .transform((email) => email.toLowerCase());

export const passwordSchema = requiredString.pipe(
  z
    .string()
    .max(128, { error: PASSWORD_MAX_MESSAGE })
    .refine((password) => password.length >= 8 && /\d/.test(password), {
      error: PASSWORD_MESSAGE,
    }),
);

// Signup form (US-01): every field is mandatory (RM-001).
export const signupSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  terms_accepted: z.literal(true, { error: TERMS_MESSAGE }),
});

// US-04: the profile changes, nothing else. The e-mail never moves
// (RM-003): sending it is refused by strict().
export const SEXES = ["female", "male"] as const;

export const SEX_LABELS: Record<Sex, string> = {
  female: "Femme",
  male: "Homme",
};

export const updateProfileSchema = z
  .object({
    username: usernameSchema,
    // The illustrations only (RM-004); null means "not chosen yet"
    sex: z.enum(SEXES).nullable(),
  })
  .strict();

export type UpdateProfileInput = z.output<typeof updateProfileSchema>;

// What the form sends: the box may still be unchecked at that point.
export type SignupPayload = {
  username: string;
  email: string;
  password: string;
  terms_accepted: boolean;
};

// What the server works with, once cleaned by the schema.
export type SignupInput = z.output<typeof signupSchema>;

// "3 champs à corriger. Le compte n'a pas été créé." (the number adapts).
export function formatSignupErrorSummary(fieldCount: number): string {
  const fields = fieldCount === 1 ? "1 champ" : `${fieldCount} champs`;
  return `${fields} à corriger. Le compte n'a pas été créé.`;
}

// Login form (US-02): username OR e-mail, and the password (RM-002).
// No format rule here: a wrong shape simply gives "identifiants incorrects",
// never a hint about which part is wrong.
export const loginSchema = z.object({
  identifier: requiredString.pipe(z.string().max(254)),
  password: requiredString.pipe(z.string().max(128)),
});

export type LoginPayload = z.input<typeof loginSchema>;

// The two letters of the avatar: "lucas_m" -> "LM", "lea.martin" -> "LM",
// "lea" -> "LE". Parts are split on ".", "_" and "-".
export function getInitials(username: string): string {
  const parts = username.split(/[._-]+/).filter((part) => part !== "");
  const letters =
    parts.length >= 2
      ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`
      : (parts[0] ?? username).slice(0, 2);
  return letters.toUpperCase();
}
