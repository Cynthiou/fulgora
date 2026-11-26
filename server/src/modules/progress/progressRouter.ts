import express from "express";
import { idParamSchema } from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { browse, read } from "./progressActions.js";

const progressRouter = express.Router();

// GET /api/progress/exercises?search=: the exercises already done (US-39).
progressRouter.get("/exercises", authenticate, browse);

// GET /api/progress/exercises/:id: the sets of one exercise, session by
// session.
progressRouter.get(
  "/exercises/:id",
  authenticate,
  validate({ params: idParamSchema }),
  read,
);

export default progressRouter;
