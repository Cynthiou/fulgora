import express from "express";
import { actualSetSchema, idParamSchema } from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { removeSet } from "./workoutAddActions.js";
import { correctSet, validateSet } from "./workoutSetActions.js";

const workoutSetRouter = express.Router();

// PUT /api/workout-sets/:id: what was really done on a set (US-29)
workoutSetRouter.put(
  "/:id",
  authenticate,
  validate({ params: idParamSchema, body: actualSetSchema }),
  validateSet,
);

// PUT /api/workout-sets/:id/correction: fixes a set of a session already
// over (US-37).
workoutSetRouter.put(
  "/:id/correction",
  authenticate,
  validate({ params: idParamSchema, body: actualSetSchema }),
  correctSet,
);

// DELETE /api/workout-sets/:id: removes a set added during the session
// (US-32); a planned set never goes away (RM-048).
workoutSetRouter.delete(
  "/:id",
  authenticate,
  validate({ params: idParamSchema }),
  removeSet,
);

export default workoutSetRouter;
