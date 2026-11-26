import express from "express";
import { authenticate } from "./middlewares/authenticate.js";
import appointmentRouter from "./modules/appointment/appointmentRouter.js";
import {
  browseCategories,
  browseEquipments,
} from "./modules/exercise/exerciseActions.js";
import exerciseRouter from "./modules/exercise/exerciseRouter.js";
import historyRouter from "./modules/history/historyRouter.js";
import notificationRouter from "./modules/notification/notificationRouter.js";
import programRouter from "./modules/program/programRouter.js";
import progressRouter from "./modules/progress/progressRouter.js";
import authRouter from "./modules/user/authRouter.js";
import userRouter from "./modules/user/userRouter.js";
import workoutBlockRouter from "./modules/workout-session/workoutBlockRouter.js";
import workoutExerciseRouter from "./modules/workout-session/workoutExerciseRouter.js";
import workoutSessionRouter from "./modules/workout-session/workoutSessionRouter.js";
import workoutSetRouter from "./modules/workout-session/workoutSetRouter.js";

const router = express.Router();

// Quick check that the server answers.
router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Each module plugs its own router here.
router.use("/users", userRouter);
router.use("/auth", authRouter);
router.use("/exercises", exerciseRouter);
// Reference lists of the catalog, for the filters (US-08).
router.get("/categories", authenticate, browseCategories);
router.get("/equipments", authenticate, browseEquipments);
router.use("/appointments", appointmentRouter);
router.use("/workout-sessions", workoutSessionRouter);
router.use("/workout-sets", workoutSetRouter);
router.use("/workout-blocks", workoutBlockRouter);
router.use("/workout-exercises", workoutExerciseRouter);
router.use("/history", historyRouter);
router.use("/notifications", notificationRouter);
router.use("/programs", programRouter);
router.use("/progress", progressRouter);

export default router;
