import express from "express";
import {
  dateRangeSchema,
  declareDoneSchema,
  freeSessionSchema,
  idParamSchema,
  moveAppointmentSchema,
  sessionEditSchema,
} from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import {
  declareDone,
  readDeclaration,
} from "../workout-session/declareActions.js";
import {
  browse,
  cancel,
  createFree,
  markNotDone,
  move,
  read,
} from "./appointmentActions.js";
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

// PATCH /api/appointments/:id/cancel: give up a session before it starts.
appointmentRouter.patch(
  "/:id/cancel",
  authenticate,
  validate({ params: idParamSchema }),
  cancel,
);

// PATCH /api/appointments/:id/move: the session changes day (US-25).
appointmentRouter.patch(
  "/:id/move",
  authenticate,
  validate({ params: idParamSchema, body: moveAppointmentSchema }),
  move,
);

// POST /api/appointments/:id/not-done: "Pas faite" (US-27).
appointmentRouter.post(
  "/:id/not-done",
  authenticate,
  validate({ params: idParamSchema }),
  markNotDone,
);

// GET /api/appointments/:id/declaration: the plan to confirm, set by set
// (US-38, CAL-08b).
appointmentRouter.get(
  "/:id/declaration",
  authenticate,
  validate({ params: idParamSchema }),
  readDeclaration,
);

// POST /api/appointments/:id/declare-done: the session written after the
// fact (US-38).
appointmentRouter.post(
  "/:id/declare-done",
  authenticate,
  validate({ params: idParamSchema, body: declareDoneSchema }),
  declareDone,
);

export default appointmentRouter;
