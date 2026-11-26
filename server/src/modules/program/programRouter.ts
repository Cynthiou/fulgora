import express from "express";
import {
  idParamSchema,
  programInfoSchema,
  programScheduleSchema,
  programSessionParamsSchema,
  programSessionSchema,
  sessionEditSchema,
} from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import {
  activate,
  addSession,
  browse,
  createDraft,
  previewSchedule,
  read,
  readDaySession,
  removeDraft,
  removeSession,
  restoreSession,
  updateDraft,
  updateSchedule,
  writeDaySession,
} from "./programActions.js";

const programRouter = express.Router();

// GET /api/programs: the programs of the user (US-48).
programRouter.get("/", authenticate, browse);

// POST /api/programs: step 1 of the creation, saved as a draft (US-18).
programRouter.post(
  "/",
  authenticate,
  validate({ body: programInfoSchema }),
  createDraft,
);

// GET /api/programs/:id: the program, its days and its sessions.
programRouter.get(
  "/:id",
  authenticate,
  validate({ params: idParamSchema }),
  read,
);

// PUT /api/programs/:id: the period and the days of a draft.
programRouter.put(
  "/:id",
  authenticate,
  validate({ params: idParamSchema, body: programInfoSchema }),
  updateDraft,
);

// POST /api/programs/:id/schedule/preview: what a change of days, hours or
// end date would do, before anything is written (US-20).
programRouter.post(
  "/:id/schedule/preview",
  authenticate,
  validate({ params: idParamSchema, body: programScheduleSchema }),
  previewSchedule,
);

// PUT /api/programs/:id/schedule: the same change, applied.
programRouter.put(
  "/:id/schedule",
  authenticate,
  validate({ params: idParamSchema, body: programScheduleSchema }),
  updateSchedule,
);

// POST /api/programs/:id/activate: the draft fills the Planning.
programRouter.post(
  "/:id/activate",
  authenticate,
  validate({ params: idParamSchema }),
  activate,
);

// DELETE /api/programs/:id: a draft thrown away.
programRouter.delete(
  "/:id",
  authenticate,
  validate({ params: idParamSchema }),
  removeDraft,
);

// POST /api/programs/:id/sessions: one more session on a day (US-19).
programRouter.post(
  "/:id/sessions",
  authenticate,
  validate({ params: idParamSchema, body: programSessionSchema }),
  addSession,
);

// GET /api/programs/:id/sessions/:scheduleId: one session of the typical
// week, as a draft for the editor (US-18, step 2).
programRouter.get(
  "/:id/sessions/:scheduleId",
  authenticate,
  validate({ params: programSessionParamsSchema }),
  readDaySession,
);

// PUT /api/programs/:id/sessions/:scheduleId: what the editor built.
programRouter.put(
  "/:id/sessions/:scheduleId",
  authenticate,
  validate({ params: programSessionParamsSchema, body: sessionEditSchema }),
  writeDaySession,
);

// DELETE /api/programs/:id/sessions/:scheduleId: the session leaves the
// week; POST .../restore puts it back (PRO-03c, PRO-03d).
programRouter.delete(
  "/:id/sessions/:scheduleId",
  authenticate,
  validate({ params: programSessionParamsSchema }),
  removeSession,
);

programRouter.post(
  "/:id/sessions/:scheduleId/restore",
  authenticate,
  validate({ params: programSessionParamsSchema }),
  restoreSession,
);

export default programRouter;
