import express from "express";
import authRouter from "./modules/user/authRouter.js";
import userRouter from "./modules/user/userRouter.js";

const router = express.Router();

// Quick check that the server answers.
router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Each module plugs its own router here.
router.use("/users", userRouter);
router.use("/auth", authRouter);

export default router;
