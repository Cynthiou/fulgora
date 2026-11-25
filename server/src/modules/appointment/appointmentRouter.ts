import express from "express";
import {
  dateRangeSchema,
  freeSessionSchema,
  idParamSchema,
  sessionEditSchema,
} from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { browse, createFree, read } from "./appointmentActions.js";
import { editSession, readSession } from "./sessionEditActions.js";

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

// GET /api/appointments/:id/session: the planned session as a draft, to
// open the editor on it (US-17).
appointmentRouter.get(
  "/:id/session",
  authenticate,
  validate({ params: idParamSchema }),
  readSession,
);

// PUT /api/appointments/:id/session: the change, saved as a new version.
appointmentRouter.put(
  "/:id/session",
  authenticate,
  validate({ params: idParamSchema, body: sessionEditSchema }),
  editSession,
);

export default appointmentRouter;
