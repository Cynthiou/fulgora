import express from "express";
import { dateRangeSchema, freeSessionSchema } from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { browse, createFree } from "./appointmentActions.js";

const appointmentRouter = express.Router();

// GET /api/appointments?from=YYYY-MM-DD&to=YYYY-MM-DD
appointmentRouter.get(
  "/",
  authenticate,
  validate({ query: dateRangeSchema }),
  browse,
);

// POST /api/appointments: saves a whole free session and plans it (US-23).
appointmentRouter.post(
  "/",
  authenticate,
  validate({ body: freeSessionSchema }),
  createFree,
);

export default appointmentRouter;
