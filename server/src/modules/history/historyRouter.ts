import express from "express";
import { historyQuerySchema, idParamSchema } from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { browse, read } from "./historyActions.js";

const historyRouter = express.Router();

// GET /api/history?offset=: the past sessions, 20 at a time (US-35)
historyRouter.get(
  "/",
  authenticate,
  validate({ query: historyQuerySchema }),
  browse,
);

// GET /api/history/:id: the detail of a past session (US-36)
historyRouter.get(
  "/:id",
  authenticate,
  validate({ params: idParamSchema }),
  read,
);

export default historyRouter;
