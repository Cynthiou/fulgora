import express from "express";
import { loginSchema } from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { authLimiter } from "../../middlewares/rateLimiters.js";
import { validate } from "../../middlewares/validate.js";
import { login, logout, readMe } from "./authActions.js";

const authRouter = express.Router();

// checkOrigin and apiLimiter already run on every /api route (app.ts).
// Login is a sensitive route: 5 tries per 15 minutes (DT-07).
authRouter.post("/login", authLimiter, validate({ body: loginSchema }), login);

// Private: only the owner of a valid cookie gets an answer.
authRouter.get("/me", authenticate, readMe);
authRouter.post("/logout", authenticate, logout);

export default authRouter;
