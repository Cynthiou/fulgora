import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../src/middlewares/errorHandler.js";
import { HttpError } from "../../src/utils/httpError.js";

// A tiny app with one route per kind of error.
function buildApp() {
  const app = express();
  app.use(express.json({ limit: "1kb" }));

  app.get("/known", (_req, _res, next) => {
    next(new HttpError(422, "RULE_REFUSED", "Règle refusée.", "name"));
  });
  app.get("/boom", () => {
    throw new Error("secret technical detail");
  });
  app.post("/body", (_req, res) => {
    res.sendStatus(200);
  });

  app.use(errorHandler);
  return app;
}

describe("errorHandler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the status, code, message and field of an HttpError", async () => {
    const response = await request(buildApp()).get("/known");

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      error: { code: "RULE_REFUSED", message: "Règle refusée.", field: "name" },
    });
  });

  it("hides unexpected errors behind a generic 500 and logs them", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const response = await request(buildApp()).get("/boom");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Une erreur est survenue. Réessaie plus tard.",
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("secret");
    expect(consoleError).toHaveBeenCalledOnce();
  });

  it("answers 413 when the JSON body is too large", async () => {
    const response = await request(buildApp())
      .post("/body")
      .send({ text: "x".repeat(2_000) });

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("answers 400 when the JSON body cannot be parsed", async () => {
    const response = await request(buildApp())
      .post("/body")
      .set("Content-Type", "application/json")
      .send("{ not json");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_JSON");
  });
});
