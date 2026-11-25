import type { RequestHandler } from "express";
import { HttpError } from "../utils/httpError.js";

// Only requests that change data are checked. GET never changes anything.
const PROTECTED_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

// ALLOWED_ORIGINS="http://localhost:3000,https://fulgora.example"
// Read on each request, so tests can change it and the server has no cache.
function readAllowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin !== "");
}

// The Origin header is already an origin ("https://site.fr").
// Referer is a full address ("https://site.fr/page?x=1"): new URL() extracts
// its origin. Returns null when neither header is usable.
function readRequestOrigin(
  originHeader: string | undefined,
  refererHeader: string | undefined,
): string | null {
  if (originHeader) {
    return originHeader;
  }
  if (!refererHeader) {
    return null;
  }
  try {
    return new URL(refererHeader).origin;
  } catch {
    return null;
  }
}

// Refuses (403) any POST / PUT / PATCH / DELETE that does not come from one of
// the allowed origins. The comparison is exact: no "starts with".
export const checkOrigin: RequestHandler = (req, _res, next) => {
  if (!PROTECTED_METHODS.includes(req.method)) {
    next();
    return;
  }

  const origin = readRequestOrigin(req.get("origin"), req.get("referer"));

  if (origin === null || !readAllowedOrigins().includes(origin)) {
    next(
      new HttpError(
        403,
        "FORBIDDEN_ORIGIN",
        "Requête refusée : origine non autorisée.",
      ),
    );
    return;
  }

  next();
};
