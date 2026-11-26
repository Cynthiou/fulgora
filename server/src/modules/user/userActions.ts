import type { RequestHandler } from "express";
import {
  type ChangePasswordInput,
  type PublicUser,
  type SignupInput,
  type UpdatePreferencesInput,
  type UpdateProfileInput,
  WRONG_PASSWORD_MESSAGE,
} from "shared";
import { readDuplicateKeyName } from "../../database/errors.js";
import { setAuthCookie } from "../../utils/authCookie.js";
import { HttpError } from "../../utils/httpError.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { readUserId } from "../../utils/requestUser.js";
import { signToken } from "../../utils/token.js";
import {
  createUser,
  readUser,
  readUserPasswordHash,
  updateUserPassword,
  updateUserPreferences,
  updateUserProfile,
} from "./userRepository.js";

// Which unique key refused the INSERT tells which field is taken (RM-001).
function toTakenError(error: unknown): HttpError | null {
  switch (readDuplicateKeyName(error)) {
    case "uq_user_username":
      return new HttpError(
        409,
        "USERNAME_TAKEN",
        "Ce pseudo est déjà utilisé. Choisis-en un autre.",
        "username",
      );
    case "uq_user_email":
      return new HttpError(
        409,
        "EMAIL_TAKEN",
        "Un compte existe déjà avec cette adresse.",
        "email",
      );
    default:
      return null;
  }
}

// POST /api/users: creates the account and opens the session right away.
// The body was validated and cleaned by signupSchema before reaching here.
export const create: RequestHandler = async (req, res) => {
  const { username, email, password } = req.body as SignupInput;

  // The password itself is never stored, logged nor sent back (DT-01).
  const passwordHash = await hashPassword(password);

  let id: number;
  try {
    id = await createUser(username, email, passwordHash);
  } catch (error) {
    throw toTakenError(error) ?? error;
  }

  setAuthCookie(res, signToken(id));

  // A new account carries the default preferences, like its columns.
  // The account is read back: its creation date and its preferences come
  // from the table, with no second source of truth.
  const user = await readUser(id);
  if (user === null) {
    throw new HttpError(404, "USER_NOT_FOUND", "Ce compte n'existe pas.");
  }
  res.status(201).json(user satisfies PublicUser);
};

// PATCH /api/users/me: the pseudo and the illustrations (US-04). The
// e-mail is refused by the schema (RM-003), and the id always comes from
// the token, never from the body.
export const updateProfile: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { username, sex } = req.body as UpdateProfileInput;

  try {
    await updateUserProfile(userId, username, sex);
  } catch (error) {
    throw toTakenError(error) ?? error;
  }

  const user = await readUser(userId);
  if (user === null) {
    throw new HttpError(404, "USER_NOT_FOUND", "Ce compte n'existe pas.");
  }
  res.json(user);
};

// PATCH /api/users/me/preferences: the units, the alerts and the home
// indicator (US-05). Only the fields received are written (RM-005).
export const updatePreferences: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  await updateUserPreferences(userId, req.body as UpdatePreferencesInput);

  const user = await readUser(userId);
  if (user === null) {
    throw new HttpError(404, "USER_NOT_FOUND", "Ce compte n'existe pas.");
  }
  res.json(user);
};

// PUT /api/users/me/password: the password changes, the session stays open
// (US-47). The current password is checked first; the new one is hashed and
// never logged (DT-01).
export const changePassword: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { current_password, new_password } = req.body as ChangePasswordInput;

  const hash = await readUserPasswordHash(userId);
  if (hash === null) {
    throw new HttpError(404, "USER_NOT_FOUND", "Ce compte n'existe pas.");
  }
  if (!(await verifyPassword(hash, current_password))) {
    throw new HttpError(
      422,
      "WRONG_CURRENT_PASSWORD",
      WRONG_PASSWORD_MESSAGE,
      "current_password",
    );
  }

  await updateUserPassword(userId, await hashPassword(new_password));
  res.status(204).end();
};
