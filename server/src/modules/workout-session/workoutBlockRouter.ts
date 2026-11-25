import express from "express";
import { addWorkoutExercisesSchema, idParamSchema } from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { addExercisesToBlock } from "./workoutAddActions.js";

const workoutBlockRouter = express.Router();

// POST /api/workout-blocks/:id/exercises: the exercises chosen in the
// catalog land at the end of this block (US-32).
workoutBlockRouter.post(
  "/:id/exercises",
  authenticate,
  validate({ params: idParamSchema, body: addWorkoutExercisesSchema }),
  addExercisesToBlock,
);

export default workoutBlockRouter;
