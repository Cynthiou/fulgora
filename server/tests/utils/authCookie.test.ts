import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { clearAuthCookie, setAuthCookie } from "../../src/utils/authCookie.js";

// A tiny app: one route sets the cookie, one clears it.
function buildApp() {
  const app = express();
  app.post("/login", (_req, res) => {
    setAuthCookie(res, "the-token");
    res.sendStatus(204);
  });
  app.post("/logout", (_req, res) => {
    clearAuthCookie(res);
    res.sendStatus(204);
  });
  return app;
}

function readSetCookie(headers: Record<string, unknown>): string {
  const value = headers["set-cookie"];
  return Array.isArray(value) ? String(value[0]) : String(value);
}

describe("setAuthCookie", () => {
  const previousNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = previousNodeEnv;
  });

  it("sets an httpOnly, strict, 7 day cookie on the whole site", async () => {
    const response = await request(buildApp()).post("/login");
    const cookie = readSetCookie(response.headers);

    expect(cookie).toContain("fulgora_token=the-token");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=604800");
    expect(cookie).not.toContain("Secure");
  });

  it("adds the Secure flag in production", async () => {
    process.env.NODE_ENV = "production";

    const response = await request(buildApp()).post("/login");

    expect(readSetCookie(response.headers)).toContain("Secure");
  });
});

describe("clearAuthCookie", () => {
  it("expires the cookie with the same name, path and flags", async () => {
    const response = await request(buildApp()).post("/logout");
    const cookie = readSetCookie(response.headers);

    expect(cookie).toContain("fulgora_token=;");
    expect(cookie).toContain("Expires=Thu, 01 Jan 1970");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Path=/");
  });
});
