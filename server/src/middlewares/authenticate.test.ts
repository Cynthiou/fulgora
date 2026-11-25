import cookieParser from "cookie-parser";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { signToken } from "../utils/token.js";
import { authenticate } from "./authenticate.js";
import { errorHandler } from "./errorHandler.js";

// A tiny app with one private route that tells who is connected.
function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.get("/me", authenticate, (req, res) => {
    res.json({ userId: req.userId });
  });
  app.use(errorHandler);
  return app;
}

describe("authenticate", () => {
  it("lets a valid token through and exposes the user id", async () => {
    const response = await request(buildApp())
      .get("/me")
      .set("Cookie", `fulgora_token=${signToken(42)}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ userId: 42 });
  });

  it("answers 401 without a cookie", async () => {
    const response = await request(buildApp()).get("/me");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "Connecte-toi pour continuer.",
      },
    });
  });

  it("answers 401 with a token signed by someone else", async () => {
    const forged = jwt.sign(
      { sub: "42" },
      "someone-else-secret-of-32-chars!!",
      {
        algorithm: "HS256",
        expiresIn: "7d",
      },
    );

    const response = await request(buildApp())
      .get("/me")
      .set("Cookie", `fulgora_token=${forged}`);

    expect(response.status).toBe(401);
  });

  it("answers 401 with garbage in the cookie", async () => {
    const response = await request(buildApp())
      .get("/me")
      .set("Cookie", "fulgora_token=garbage");

    expect(response.status).toBe(401);
  });
});
