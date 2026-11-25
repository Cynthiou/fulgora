import express from "express";
import { authenticate } from "./middlewares/authenticate.js";
import appointmentRouter from "./modules/appointment/appointmentRouter.js";
import {
  browseCategories,
  browseEquipments,
} from "./modules/exercise/exerciseActions.js";
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
// Reference lists of the catalog, for the filters (US-08).
router.get("/categories", authenticate, browseCategories);
router.get("/equipments", authenticate, browseEquipments);
router.use("/appointments", appointmentRouter);
router.use("/workout-sessions", workoutSessionRouter);

export default router;
