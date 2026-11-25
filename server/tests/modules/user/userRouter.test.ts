import type { RowDataPacket } from "mysql2/promise";
import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import app from "../../../src/app.js";
import client from "../../../src/database/client.js";
import { authLimiterStore } from "../../../src/middlewares/rateLimiters.js";

// Every account created here starts with "test_signup_" and is removed
// afterwards. Each test file uses its own prefix: files run in parallel and
// must never clean each other's accounts.
const ORIGIN = "http://localhost:3000";
const PREFIX = "test_signup_";

function uniqueSignup() {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    username: `${PREFIX}${stamp}`,
    email: `${PREFIX}${stamp}@exemple.fr`,
    password: "secret-2026",
    terms_accepted: true,
  };
}

function signup(body: object) {
  return request(app).post("/api/users").set("Origin", ORIGIN).send(body);
}

function readSetCookie(headers: Record<string, unknown>): string {
  const value = headers["set-cookie"];
  return Array.isArray(value) ? String(value[0]) : String(value);
}

describe("POST /api/users", () => {
  beforeEach(async () => {
    // 5 signups per 15 minutes per IP: start every test with a clean counter.
    await authLimiterStore.resetAll();
  });

  afterEach(async () => {
    await client.execute("DELETE FROM `user` WHERE username LIKE ?", [
      `${PREFIX}%`,
    ]);
  });

  afterAll(async () => {
    await client.end();
  });

  it("creates the account, opens the session and never returns the hash", async () => {
    const body = uniqueSignup();

    const response = await signup(body);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: expect.any(Number),
      username: body.username,
      email: body.email,
      sex: null,
    });
    expect(JSON.stringify(response.body)).not.toContain("argon2");

    const cookie = readSetCookie(response.headers);
    expect(cookie).toContain("fulgora_token=");
    expect(cookie).toContain("HttpOnly");

    const [rows] = await client.execute<RowDataPacket[]>(
      "SELECT password_hash, terms_accepted_at FROM `user` WHERE id = ?",
      [response.body.id],
    );
    expect(String(rows[0]?.password_hash).startsWith("$argon2id$")).toBe(true);
    expect(rows[0]?.terms_accepted_at).not.toBeNull();
  });

  it("stores the e-mail in lowercase", async () => {
    const body = uniqueSignup();

    const response = await signup({
      ...body,
      email: body.email.toUpperCase(),
    });

    expect(response.status).toBe(201);
    expect(response.body.email).toBe(body.email);
  });

  it("answers 409 USERNAME_TAKEN when the username exists", async () => {
    const first = uniqueSignup();
    await signup(first);

    const response = await signup({
      ...uniqueSignup(),
      username: first.username,
    });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatchObject({
      code: "USERNAME_TAKEN",
      field: "username",
      message: "Ce pseudo est déjà utilisé. Choisis-en un autre.",
    });
  });

  it("answers 409 EMAIL_TAKEN when the e-mail exists, even in capitals", async () => {
    const first = uniqueSignup();
    await signup(first);

    const response = await signup({
      ...uniqueSignup(),
      email: first.email.toUpperCase(),
    });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatchObject({
      code: "EMAIL_TAKEN",
      field: "email",
    });
  });

  it("answers 400 with every empty field", async () => {
    const response = await signup({
      username: "",
      email: "",
      password: "",
      terms_accepted: false,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    const fields = response.body.error.fields.map(
      (field: { field: string }) => field.field,
    );
    expect(fields).toEqual(["username", "email", "password", "terms_accepted"]);
  });

  it("answers 403 without an allowed origin", async () => {
    const response = await request(app).post("/api/users").send(uniqueSignup());

    expect(response.status).toBe(403);
  });

  it("answers 429 on the 6th try", async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await signup({ username: "" });
    }

    const response = await signup(uniqueSignup());

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe("TOO_MANY_REQUESTS");
  });
});
