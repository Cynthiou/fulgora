import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkOrigin } from "../../src/middlewares/checkOrigin.js";
import { errorHandler } from "../../src/middlewares/errorHandler.js";

const ALLOWED = "http://localhost:3000";

// A tiny app: the middleware, one GET and one POST that both answer 200.
function buildApp() {
  const app = express();
  app.use(checkOrigin);
  app.get("/", (_req, res) => {
    res.sendStatus(200);
  });
  app.post("/", (_req, res) => {
    res.sendStatus(200);
  });
  app.use(errorHandler);
  return app;
}

describe("checkOrigin", () => {
  let previousAllowedOrigins: string | undefined;

  beforeAll(() => {
    previousAllowedOrigins = process.env.ALLOWED_ORIGINS;
    process.env.ALLOWED_ORIGINS = `${ALLOWED}, https://fulgora.example`;
  });

  afterAll(() => {
    process.env.ALLOWED_ORIGINS = previousAllowedOrigins;
  });

  it("refuses a POST without Origin nor Referer", async () => {
    const response = await request(buildApp()).post("/");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN_ORIGIN");
  });

  it("refuses a POST from another site", async () => {
    const response = await request(buildApp())
      .post("/")
      .set("Origin", "https://evil.example");

    expect(response.status).toBe(403);
  });

  it("refuses an origin that only starts like an allowed one", async () => {
    const response = await request(buildApp())
      .post("/")
      .set("Origin", `${ALLOWED}.evil.example`);

    expect(response.status).toBe(403);
  });

  it("accepts a POST from an allowed Origin", async () => {
    const response = await request(buildApp()).post("/").set("Origin", ALLOWED);

    expect(response.status).toBe(200);
  });

  it("falls back to the Referer when Origin is missing", async () => {
    const response = await request(buildApp())
      .post("/")
      .set("Referer", `${ALLOWED}/connexion?next=/accueil`);

    expect(response.status).toBe(200);
  });

  it("refuses an unreadable Referer", async () => {
    const response = await request(buildApp())
      .post("/")
      .set("Referer", "not a url");

    expect(response.status).toBe(403);
  });

  it("does not check GET requests", async () => {
    const response = await request(buildApp()).get("/");

    expect(response.status).toBe(200);
  });
});
