import type { Request } from "express";
import { HttpError } from "./httpError.js";

// The connected user's id, filled by the authenticate middleware. Always read
// from here, never from the body, the address or the query (DT-06).
export function readUserId(req: Request): number {
  if (req.userId === undefined) {
    throw new HttpError(401, "UNAUTHENTICATED", "Connecte-toi pour continuer.");
  }
  return req.userId;
}
