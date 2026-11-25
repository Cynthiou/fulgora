import express from "express";
import appointmentRouter from "./modules/appointment/appointmentRouter.js";
import exerciseRouter from "./modules/exercise/exerciseRouter.js";
import authRouter from "./modules/user/authRouter.js";
import userRouter from "./modules/user/userRouter.js";
import workoutSessionRouter from "./modules/workout-session/workoutSessionRouter.js";

const router = express.Router();

// Quick check that the server answers.
router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Each module plugs its own router here.
router.use("/users", userRouter);
router.use("/auth", authRouter);
router.use("/exercises", exerciseRouter);
router.use("/appointments", appointmentRouter);
router.use("/workout-sessions", workoutSessionRouter);

export default router;
