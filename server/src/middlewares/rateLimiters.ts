import { rateLimit } from "express-rate-limit";
import { HttpError } from "../utils/httpError.js";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

// Counts requests per IP address in a 15 minute window. Above the limit, the
// request is refused with the common error format (429).
function buildLimiter(limit: number) {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit,
    // Tell the client its remaining budget with the standard RateLimit header.
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(
        new HttpError(
          429,
          "TOO_MANY_REQUESTS",
          "Trop de tentatives. Réessaie dans quelques minutes.",
        ),
      );
    },
  });
}

// Login, signup, password change: 5 tries, then wait (brute force protection).
export const authLimiter = buildLimiter(5);

// Everything else: generous, only stops a runaway script.
export const apiLimiter = buildLimiter(300);
