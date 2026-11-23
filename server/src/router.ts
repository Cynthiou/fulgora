import express from "express";

const router = express.Router();

// Quick check that the server answers.
router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Each module will plug its own router here, for example:
// router.use("/exercises", exerciseRouter);

export default router;
