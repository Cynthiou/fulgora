import express from "express";
import {
  addWorkoutBlockSchema,
  idParamSchema,
  startWorkoutSchema,
} from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { addBlock } from "./workoutAddActions.js";
import {
  abandon,
  complete,
  read,
  readCurrent,
  start,
} from "./workoutSessionActions.js";

const workoutSessionRouter = express.Router();

// POST /api/workout-sessions { appointment_id }: start a planned session (US-28)
workoutSessionRouter.post(
  "/",
  authenticate,
  validate({ body: startWorkoutSchema }),
  start,
);

// Fixed routes come before routes with a parameter (/current before /:id).
workoutSessionRouter.get("/current", authenticate, readCurrent);

// GET /api/workout-sessions/:id: the whole tree of a realized session
workoutSessionRouter.get(
  "/:id",
  authenticate,
  validate({ params: idParamSchema }),
  read,
);

// POST /api/workout-sessions/:id/abandon: stop before the end (US-33)
workoutSessionRouter.post(
  "/:id/abandon",
  authenticate,
  validate({ params: idParamSchema }),
  abandon,
);

// POST /api/workout-sessions/:id/complete: the end of the session (US-34)
workoutSessionRouter.post(
  "/:id/complete",
  authenticate,
  validate({ params: idParamSchema }),
  complete,
);

// POST /api/workout-sessions/:id/blocks: one more block during the session
// (US-32), with the exercises chosen in the catalog.
workoutSessionRouter.post(
  "/:id/blocks",
  authenticate,
  validate({ params: idParamSchema, body: addWorkoutBlockSchema }),
  addBlock,
);

export default workoutSessionRouter;
