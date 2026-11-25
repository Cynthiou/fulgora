import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { checkOrigin } from "./middlewares/checkOrigin.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { apiLimiter } from "./middlewares/rateLimiters.js";
import router from "./router.js";
import { HttpError } from "./utils/httpError.js";

const app = express();

// Never tell the world which framework runs the server.
app.disable("x-powered-by");
// Standard security headers on every answer.
app.use(helmet());
// A JSON body bigger than 100 kB is refused (413).
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// Every write (POST, PUT, PATCH, DELETE) must come from an allowed origin.
// 300 requests per IP and 15 minutes; stricter limits sit on the auth routes.
app.use("/api", apiLimiter, checkOrigin, router);

// Unknown route: same error shape as everything else, not the Express HTML page.
app.use((_req, _res, next) => {
  next(new HttpError(404, "NOT_FOUND", "Route introuvable."));
});

// Last stop: any error passed to next(err) ends up here.
app.use(errorHandler);

export default app;
