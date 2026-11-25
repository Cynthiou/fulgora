import express from "express";
import { actualSetSchema, idParamSchema } from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { validateSet } from "./workoutSetActions.js";

const workoutSetRouter = express.Router();

// PUT /api/workout-sets/:id: what was really done on a set (US-29)
workoutSetRouter.put(
  "/:id",
  authenticate,
  validate({ params: idParamSchema, body: actualSetSchema }),
  validateSet,
);

export default workoutSetRouter;
