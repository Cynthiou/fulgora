import express from "express";
import { idParamSchema } from "shared";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import {
  browse,
  markAllRead,
  markRead,
  readUnreadCount,
} from "./notificationActions.js";

const notificationRouter = express.Router();

// GET /api/notifications: the list and the unread count (US-46).
notificationRouter.get("/", authenticate, browse);

// Fixed routes come before the ones with a parameter.
notificationRouter.get("/unread-count", authenticate, readUnreadCount);
notificationRouter.patch("/read-all", authenticate, markAllRead);

// PATCH /api/notifications/:id/read: one notification was seen.
notificationRouter.patch(
  "/:id/read",
  authenticate,
  validate({ params: idParamSchema }),
  markRead,
);

export default notificationRouter;
