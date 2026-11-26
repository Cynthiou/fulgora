import type { RequestHandler } from "express";
import {
  type ChangePasswordInput,
  type DeleteAccountInput,
  type PublicUser,
  type SignupInput,
  type UpdatePreferencesInput,
  type UpdateProfileInput,
  WRONG_DELETE_PASSWORD_MESSAGE,
  WRONG_PASSWORD_MESSAGE,
} from "shared";
import { readDuplicateKeyName } from "../../database/errors.js";
import { withTransaction } from "../../database/withTransaction.js";
import { clearAuthCookie, setAuthCookie } from "../../utils/authCookie.js";
import { HttpError } from "../../utils/httpError.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { readUserId } from "../../utils/requestUser.js";
import { signToken } from "../../utils/token.js";
import {
  clearExerciseSources,
  clearProgramSources,
  deleteUserAppointments,
  deleteUserExerciseCategories,
  deleteUserExerciseEquipment,
  deleteUserExerciseMeasures,
  deleteUserExerciseMuscles,
  deleteUserExercises,
  deleteUserExerciseTexts,
  deleteUserNotifications,
  deleteUserPlannedSets,
  deleteUserProgramChanges,
  deleteUserPrograms,
  deleteUserRow,
  deleteUserSessionTemplates,
  deleteUserSessionVersions,
  deleteUserTemplateBlockExercises,
  deleteUserTemplateBlocks,
  deleteUserWeeklySchedules,
  deleteUserWorkoutBlocks,
  deleteUserWorkoutExercises,
  deleteUserWorkoutSessions,
  deleteUserWorkoutSetSides,
  deleteUserWorkoutSets,
} from "./accountRepository.js";
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

// DELETE /api/users/me: the account and everything it owns disappear
// (US-06, RM-006). Every table is emptied in the order of its dependencies,
// inside one transaction: if one step fails, nothing is deleted (DT-17).
export const deleteAccount: RequestHandler = async (req, res) => {
  const userId = readUserId(req);
  const { password } = req.body as DeleteAccountInput;

  const hash = await readUserPasswordHash(userId);
  if (hash === null) {
    throw new HttpError(404, "USER_NOT_FOUND", "Ce compte n'existe pas.");
  }
  if (!(await verifyPassword(hash, password))) {
    throw new HttpError(
      422,
      "WRONG_PASSWORD",
      WRONG_DELETE_PASSWORD_MESSAGE,
      "password",
    );
  }

  await withTransaction(async (connection) => {
    // The realized sessions, from the smallest piece to the appointment
    await deleteUserNotifications(userId, connection);
    await deleteUserWorkoutSetSides(userId, connection);
    await deleteUserWorkoutSets(userId, connection);
    await deleteUserWorkoutExercises(userId, connection);
    await deleteUserWorkoutBlocks(userId, connection);
    await deleteUserWorkoutSessions(userId, connection);
    await deleteUserAppointments(userId, connection);

    // The programs, their weeks and their history
    await deleteUserWeeklySchedules(userId, connection);
    await deleteUserProgramChanges(userId, connection);
    await clearProgramSources(userId, connection);
    await deleteUserPrograms(userId, connection);

    // The session templates and their versions
    await deleteUserPlannedSets(userId, connection);
    await deleteUserTemplateBlockExercises(userId, connection);
    await deleteUserTemplateBlocks(userId, connection);
    await deleteUserSessionVersions(userId, connection);
    await deleteUserSessionTemplates(userId, connection);

    // The personal exercises; the catalog is never touched
    await clearExerciseSources(userId, connection);
    await deleteUserExerciseTexts(userId, connection);
    await deleteUserExerciseCategories(userId, connection);
    await deleteUserExerciseMuscles(userId, connection);
    await deleteUserExerciseEquipment(userId, connection);
    await deleteUserExerciseMeasures(userId, connection);
    await deleteUserExercises(userId, connection);

    await deleteUserRow(userId, connection);
  });

  clearAuthCookie(res);
  res.status(204).end();
};
