import express from "express";
import { authenticate } from "../../middlewares/authenticate.js";
import { readCurrent } from "./workoutSessionActions.js";

const workoutSessionRouter = express.Router();

// Fixed routes come before routes with a parameter (/current before /:id).
workoutSessionRouter.get("/current", authenticate, readCurrent);

export default workoutSessionRouter;
