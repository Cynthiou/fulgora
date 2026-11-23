import cookieParser from "cookie-parser";
import express, { type ErrorRequestHandler } from "express";
import router from "./router.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api", router);

// Last stop: any error passed to next(err) ends up here.
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.sendStatus(500);
};
app.use(errorHandler);

export default app;
