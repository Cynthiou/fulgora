import express from "express";
import { idParamSchema } from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { addSet } from "./workoutAddActions.js";

const workoutExerciseRouter = express.Router();

// POST /api/workout-exercises/:id/sets: one more set on this exercise
// during the session (US-32).
workoutExerciseRouter.post(
  "/:id/sets",
  authenticate,
  validate({ params: idParamSchema }),
  addSet,
);

export default workoutExerciseRouter;
