import express from "express";
import { idParamSchema, startWorkoutSchema } from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { read, readCurrent, start } from "./workoutSessionActions.js";

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

export default workoutSessionRouter;
