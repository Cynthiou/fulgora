import type { RequestHandler } from "express";
import { AUTH_COOKIE_NAME } from "../utils/authCookie.js";
import { HttpError } from "../utils/httpError.js";
import { verifyToken } from "../utils/token.js";

// Protects a private route: reads the token from the cookie, checks it and
// stores the user id in req.userId. The id always comes from the token,
// never from the body, the address or the query (DT-06).
export const authenticate: RequestHandler = (req, _res, next) => {
  const token: unknown = req.cookies?.[AUTH_COOKIE_NAME];
  const userId = typeof token === "string" ? verifyToken(token) : null;

  if (userId === null) {
    next(new HttpError(401, "UNAUTHENTICATED", "Connecte-toi pour continuer."));
    return;
  }

  req.userId = userId;
  next();
};
