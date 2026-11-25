import express from "express";
import { exerciseQuerySchema, idParamSchema } from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { browse } from "./exerciseActions.js";
import { read } from "./exerciseDetailActions.js";

const exerciseRouter = express.Router();

// GET /api/exercises?offset=0&search=&category_ids=&equipment_ids=&difficulties=
exerciseRouter.get(
  "/",
  authenticate,
  validate({ query: exerciseQuerySchema }),
  browse,
);

// GET /api/exercises/:id
exerciseRouter.get(
  "/:id",
  authenticate,
  validate({ params: idParamSchema }),
  read,
);

export default exerciseRouter;
