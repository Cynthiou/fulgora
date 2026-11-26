import express from "express";
import {
  actualSetSchema,
  idParamSchema,
  sideParamsSchema,
  sideSetSchema,
} from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { removeSet } from "./workoutAddActions.js";
import { correctSet, validateSet, validateSide } from "./workoutSetActions.js";

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

// PUT /api/workout-sets/:id/sides/:side: what was done on one side of a
// per-side set (US-51, B5g).
workoutSetRouter.put(
  "/:id/sides/:side",
  authenticate,
  validate({ params: sideParamsSchema, body: sideSetSchema }),
  validateSide,
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
