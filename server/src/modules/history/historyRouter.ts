import express from "express";
import { historyQuerySchema } from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { browse } from "./historyActions.js";

const historyRouter = express.Router();

// GET /api/history?offset=: the past sessions, 20 at a time (US-35)
historyRouter.get(
  "/",
  authenticate,
  validate({ query: historyQuerySchema }),
  browse,
);

export default historyRouter;
