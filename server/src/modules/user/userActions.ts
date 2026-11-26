import type { RequestHandler } from "express";
import type { PublicUser, SignupInput, UpdateProfileInput } from "shared";
import { readDuplicateKeyName } from "../../database/errors.js";
import { setAuthCookie } from "../../utils/authCookie.js";
import { HttpError } from "../../utils/httpError.js";
import { hashPassword } from "../../utils/password.js";
import { readUserId } from "../../utils/requestUser.js";
import { signToken } from "../../utils/token.js";
import { createUser, readUser, updateUserProfile } from "./userRepository.js";

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

  const user: PublicUser = { id, username, email, sex: null };
  res.status(201).json(user);
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
