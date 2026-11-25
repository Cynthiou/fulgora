import express from "express";
import { exerciseQuerySchema } from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { browse } from "./exerciseActions.js";

const exerciseRouter = express.Router();

// GET /api/exercises?offset=0
exerciseRouter.get(
  "/",
  authenticate,
  validate({ query: exerciseQuerySchema }),
  browse,
);

export default exerciseRouter;
