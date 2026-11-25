import express from "express";
import { dateRangeSchema } from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { browse } from "./appointmentActions.js";

const appointmentRouter = express.Router();

// GET /api/appointments?from=YYYY-MM-DD&to=YYYY-MM-DD
appointmentRouter.get(
  "/",
  authenticate,
  validate({ query: dateRangeSchema }),
  browse,
);

export default appointmentRouter;
