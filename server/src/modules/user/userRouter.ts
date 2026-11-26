import express from "express";
import { signupSchema, updateProfileSchema } from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { authLimiter } from "../../middlewares/rateLimiters.js";
import { validate } from "../../middlewares/validate.js";
import { create, updateProfile } from "./userActions.js";

const userRouter = express.Router();

// checkOrigin and apiLimiter already run on every /api route (app.ts).
// Signup is a sensitive route: 5 tries per 15 minutes (DT-07).
userRouter.post("/", authLimiter, validate({ body: signupSchema }), create);

// PATCH /api/users/me: the pseudo and the illustrations (US-04).
userRouter.patch(
  "/me",
  authenticate,
  validate({ body: updateProfileSchema }),
  updateProfile,
);

export default userRouter;
