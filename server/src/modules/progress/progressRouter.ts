import express from "express";
import { idParamSchema } from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { browse, read, readLast, summary } from "./progressActions.js";

const progressRouter = express.Router();

// GET /api/progress/summary: the summary of the week, the month or a
// program (US-41).
progressRouter.get("/summary", authenticate, summary);

// GET /api/progress/exercises?search=: the exercises already done (US-39).
progressRouter.get("/exercises", authenticate, browse);

// GET /api/progress/exercises/:id: the sets of one exercise, session by
// session.
progressRouter.get(
  "/exercises/:id",
  authenticate,
  validate({ params: idParamSchema }),
  read,
);

// GET /api/progress/exercises/:id/last: what the last finished session
// holds for this exercise (handoff des séries).
progressRouter.get(
  "/exercises/:id/last",
  authenticate,
  validate({ params: idParamSchema }),
  readLast,
);

export default progressRouter;
