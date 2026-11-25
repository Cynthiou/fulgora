import { MemoryStore, rateLimit } from "express-rate-limit";
import { HttpError } from "../utils/httpError.js";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

// 5 tries per 15 minutes on login and signup (DT-07). The end-to-end tests
// sign up and log in many times from one address in a few seconds, so their
// server gets a higher value through AUTH_RATE_LIMIT. Unset elsewhere.
const AUTH_LIMIT = Number(process.env.AUTH_RATE_LIMIT) || 5;

// 300 requests per 15 minutes on the rest of the API: generous for a person,
// stops a runaway script. The end-to-end suite goes well beyond that from one
// address, so its server gets a higher value through API_RATE_LIMIT.
const API_LIMIT = Number(process.env.API_RATE_LIMIT) || 300;

// Counts requests per IP address in a 15 minute window. Above the limit, the
// request is refused with the common error format (429). The counters live in
// the store, kept in memory.
function buildLimiter(limit: number, store: MemoryStore) {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit,
    store,
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

// Exported so that tests can reset the counters between two tests.
export const authLimiterStore = new MemoryStore();
export const apiLimiterStore = new MemoryStore();

// Login, signup, password change: a few tries, then wait (brute force protection).
export const authLimiter = buildLimiter(AUTH_LIMIT, authLimiterStore);

// Everything else: generous, only stops a runaway script.
export const apiLimiter = buildLimiter(API_LIMIT, apiLimiterStore);
