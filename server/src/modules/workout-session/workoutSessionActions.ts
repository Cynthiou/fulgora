import type { RequestHandler } from "express";

// GET /api/workout-sessions/current: the session in progress, or null.
// Delivered for real by US-28. Until then nobody can have a session in
// progress, so the answer is always null (needed by the logout, US-03).
export const readCurrent: RequestHandler = (_req, res) => {
  res.json(null);
};
