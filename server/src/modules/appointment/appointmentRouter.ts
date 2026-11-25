import express from "express";
import { dateRangeSchema, freeSessionSchema, idParamSchema } from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { browse, createFree, read } from "./appointmentActions.js";

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

// GET /api/appointments/:id: one planned session, for the detail screen (B1).
appointmentRouter.get(
  "/:id",
  authenticate,
  validate({ params: idParamSchema }),
  read,
);

export default appointmentRouter;
