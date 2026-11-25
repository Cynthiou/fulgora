import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app.js";

describe("GET /api/health", () => {
  it("answers 200 with status ok", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});

describe("HTTP hardening", () => {
  it("does not reveal the framework", async () => {
    const response = await request(app).get("/api/health");

    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("adds the Helmet security headers", async () => {
    const response = await request(app).get("/api/health");

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
  });

  it("refuses a JSON body bigger than 100 kB", async () => {
    const response = await request(app)
      .post("/api/health")
      .send({ text: "x".repeat(101 * 1024) });

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("answers 404 in the common format for an unknown route", async () => {
    const response = await request(app).get("/api/nowhere");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: "NOT_FOUND", message: "Route introuvable." },
    });
  });
});
