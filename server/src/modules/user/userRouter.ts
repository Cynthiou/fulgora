import express from "express";
import {
  changePasswordSchema,
  deleteAccountSchema,
  preferencesSchema,
  signupSchema,
  updateProfileSchema,
} from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { authLimiter } from "../../middlewares/rateLimiters.js";
import { validate } from "../../middlewares/validate.js";
import {
  changePassword,
  create,
  deleteAccount,
  updatePreferences,
  updateProfile,
} from "./userActions.js";

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

// PATCH /api/users/me/preferences: one preference or several (US-05).
userRouter.patch(
  "/me/preferences",
  authenticate,
  validate({ body: preferencesSchema }),
  updatePreferences,
);

// PUT /api/users/me/password: 5 tries per 15 minutes, like the login
// (DT-07): the current password must not be guessed by brute force.
userRouter.put(
  "/me/password",
  authLimiter,
  authenticate,
  validate({ body: changePasswordSchema }),
  changePassword,
);

// DELETE /api/users/me: the account and all its data (US-06). The
// password is asked again, so the limiter of the login applies (DT-07).
userRouter.delete(
  "/me",
  authLimiter,
  authenticate,
  validate({ body: deleteAccountSchema }),
  deleteAccount,
);

export default userRouter;
