import jwt from "jsonwebtoken";

// A token is a small signed text: it carries the user id ("sub") and an
// expiry date. The server checks the signature with its secret and needs no
// storage. Known limit (D-13): a token cannot be revoked before it expires.
const MIN_SECRET_LENGTH = 32;
const TOKEN_LIFETIME = "7d";

// The secret only comes from the environment, and a short one is refused.
export function readJwtSecret(): string {
  const secret = process.env.JWT_SECRET ?? "";
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must have at least ${MIN_SECRET_LENGTH} characters`,
    );
  }
  return secret;
}

export function signToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, readJwtSecret(), {
    algorithm: "HS256",
    expiresIn: TOKEN_LIFETIME,
  });
}

// The user id carried by a valid token, or null when the token is missing,
// expired, tampered with or signed with another secret.
export function verifyToken(token: string): number | null {
  const secret = readJwtSecret();
  try {
    const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
    if (typeof payload === "string" || typeof payload.sub !== "string") {
      return null;
    }
    const userId = Number(payload.sub);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}
