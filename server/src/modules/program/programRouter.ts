import express from "express";
import { idParamSchema, programInfoSchema } from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import {
  activate,
  browse,
  createDraft,
  read,
  removeDraft,
  updateDraft,
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

export default programRouter;
