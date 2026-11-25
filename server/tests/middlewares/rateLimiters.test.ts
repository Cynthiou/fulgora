import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorHandler } from "../../src/middlewares/errorHandler.js";
import { authLimiter } from "../../src/middlewares/rateLimiters.js";

// A tiny app: the auth limiter in front of one POST route.
function buildApp() {
  const app = express();
  app.post("/login", authLimiter, (_req, res) => {
    res.sendStatus(200);
  });
  app.use(errorHandler);
  return app;
}

describe("authLimiter", () => {
  it("accepts 5 attempts then refuses the 6th with 429", async () => {
    const app = buildApp();

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await request(app).post("/login");
      expect(response.status).toBe(200);
    }

    const sixth = await request(app).post("/login");

    expect(sixth.status).toBe(429);
    expect(sixth.body).toEqual({
      error: {
        code: "TOO_MANY_REQUESTS",
        message: "Trop de tentatives. Réessaie dans quelques minutes.",
      },
    });
  });
});
