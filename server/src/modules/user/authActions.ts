import type { RequestHandler } from "express";
import type { LoginPayload, PublicUser } from "shared";
import { setAuthCookie } from "../../utils/authCookie.js";
import { HttpError } from "../../utils/httpError.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { signToken } from "../../utils/token.js";
import { readUser, readUserByIdentifier } from "./userRepository.js";

// One message for both cases, so nobody can tell which part is wrong.
function invalidCredentials() {
  return new HttpError(
    401,
    "INVALID_CREDENTIALS",
    "Identifiants incorrects. Vérifie ta saisie et réessaie.",
  );
}

// A hash of nothing in particular, computed once. When the account does not
// exist, the password is checked against it anyway: the answer takes the same
// time as for a real account, so an attacker cannot guess which usernames exist.
let dummyHash: Promise<string> | null = null;
function readDummyHash(): Promise<string> {
  dummyHash ??= hashPassword("not-a-real-password");
  return dummyHash;
}

// POST /api/auth/login: opens the session when the password matches.
export const login: RequestHandler = async (req, res) => {
  const { identifier, password } = req.body as LoginPayload;

  const found = await readUserByIdentifier(identifier);
  const hash = found === null ? await readDummyHash() : found.password_hash;
  const isValid = await verifyPassword(hash, password);

  if (found === null || !isValid) {
    throw invalidCredentials();
  }

  setAuthCookie(res, signToken(found.id));

  const user: PublicUser = {
    id: found.id,
    username: found.username,
    email: found.email,
    sex: found.sex,
  };
  res.json(user);
};

// GET /api/auth/me: who owns the cookie. The id comes from the token only.
export const readMe: RequestHandler = async (req, res) => {
  const userId = req.userId;
  const user = userId === undefined ? null : await readUser(userId);

  // A valid token for an account that no longer exists: not connected.
  if (user === null) {
    throw new HttpError(401, "UNAUTHENTICATED", "Connecte-toi pour continuer.");
  }

  res.json(user);
};
