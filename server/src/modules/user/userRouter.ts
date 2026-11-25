import express from "express";
import { signupSchema } from "shared";
import { authLimiter } from "../../middlewares/rateLimiters.js";
import { validate } from "../../middlewares/validate.js";
import { create } from "./userActions.js";

const userRouter = express.Router();

// checkOrigin and apiLimiter already run on every /api route (app.ts).
// Signup is a sensitive route: 5 tries per 15 minutes (DT-07).
userRouter.post("/", authLimiter, validate({ body: signupSchema }), create);

export default userRouter;
