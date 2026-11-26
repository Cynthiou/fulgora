import express from "express";
import {
  addWorkoutExercisesSchema,
  blockResultSchema,
  idParamSchema,
} from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { addExercisesToBlock, saveBlockResult } from "./workoutAddActions.js";

const workoutBlockRouter = express.Router();

// POST /api/workout-blocks/:id/exercises: the exercises chosen in the
// catalog land at the end of this block (US-32).
workoutBlockRouter.post(
  "/:id/exercises",
  authenticate,
  validate({ params: idParamSchema, body: addWorkoutExercisesSchema }),
  addExercisesToBlock,
);

// PUT /api/workout-blocks/:id: the result of a timed block (US-31).
workoutBlockRouter.put(
  "/:id",
  authenticate,
  validate({ params: idParamSchema, body: blockResultSchema }),
  saveBlockResult,
);

export default workoutBlockRouter;
