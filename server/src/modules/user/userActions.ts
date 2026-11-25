import type { RequestHandler } from "express";
import type { PublicUser, SignupInput } from "shared";
import { readDuplicateKeyName } from "../../database/errors.js";
import { setAuthCookie } from "../../utils/authCookie.js";
import { HttpError } from "../../utils/httpError.js";
import { hashPassword } from "../../utils/password.js";
import { signToken } from "../../utils/token.js";
import { createUser } from "./userRepository.js";

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
