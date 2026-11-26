import type { RowDataPacket } from "mysql2/promise";
import { DEFAULT_PREFERENCES } from "shared";
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

  it("creates the account, opens the session and never returns the hash", async () => {
    const body = uniqueSignup();

    const response = await signup(body);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: expect.any(Number),
      username: body.username,
      email: body.email,
      sex: null,
      created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      preferences: DEFAULT_PREFERENCES,
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

// US-04: the profile changes, the e-mail never does (RM-003).
describe("PATCH /api/users/me", () => {
  beforeEach(async () => {
    await authLimiterStore.resetAll();
  });

  afterEach(async () => {
    await client.execute("DELETE FROM `user` WHERE username LIKE ?", [
      `${PREFIX}%`,
    ]);
  });

  // An account, with the cookie of its session.
  async function account() {
    const body = uniqueSignup();
    const response = await signup(body);
    expect(response.status).toBe(201);
    return { ...body, cookie: readSetCookie(response.headers) };
  }

  function patch(cookie: string, payload: object) {
    return request(app)
      .patch("/api/users/me")
      .set("Origin", ORIGIN)
      .set("Cookie", cookie)
      .send(payload);
  }

  it("changes the pseudo and the illustrations", async () => {
    const user = await account();

    const response = await patch(user.cookie, {
      username: `${user.username}x`,
      sex: "male",
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      username: `${user.username}x`,
      sex: "male",
      email: user.email,
    });
  });

  it("refuses a pseudo already taken, an e-mail and an empty pseudo", async () => {
    const lea = await account();
    const other = await account();

    const taken = await patch(lea.cookie, {
      username: other.username,
      sex: null,
    });
    expect(taken.status).toBe(409);
    expect(taken.body.error.code).toBe("USERNAME_TAKEN");

    // The e-mail is not part of the schema (RM-003)
    const withEmail = await patch(lea.cookie, {
      username: lea.username,
      sex: null,
      email: "autre@exemple.fr",
    });
    expect(withEmail.status).toBe(400);

    const empty = await patch(lea.cookie, { username: "", sex: null });
    expect(empty.status).toBe(400);

    // Nothing moved
    const me = await request(app).get("/api/auth/me").set("Cookie", lea.cookie);
    expect(me.body.username).toBe(lea.username);
    expect(me.body.email).toBe(lea.email);
  });

  it("refuses an anonymous visitor", async () => {
    const response = await request(app)
      .patch("/api/users/me")
      .set("Origin", ORIGIN)
      .send({ username: "quelquun", sex: null });

    expect(response.status).toBe(401);
  });
});

// US-05: the preferences, one at a time or several (RM-005, DT-11).
describe("PATCH /api/users/me/preferences", () => {
  beforeEach(async () => {
    await authLimiterStore.resetAll();
  });

  afterEach(async () => {
    await client.execute("DELETE FROM `user` WHERE username LIKE ?", [
      `${PREFIX}%`,
    ]);
  });

  async function account() {
    const body = uniqueSignup();
    const response = await signup(body);
    expect(response.status).toBe(201);
    return { ...body, cookie: readSetCookie(response.headers) };
  }

  function patch(cookie: string, payload: object) {
    return request(app)
      .patch("/api/users/me/preferences")
      .set("Origin", ORIGIN)
      .set("Cookie", cookie)
      .send(payload);
  }

  it("writes one preference and leaves the others alone", async () => {
    const user = await account();

    const response = await patch(user.cookie, { weight_unit: "lb" });

    expect(response.status).toBe(200);
    expect(response.body.preferences).toEqual({
      ...DEFAULT_PREFERENCES,
      weight_unit: "lb",
    });
  });

  it("writes several preferences at once", async () => {
    const user = await account();

    const response = await patch(user.cookie, {
      distance_unit: "mi",
      home_metric: "none",
      sound_enabled: false,
      timer_notification_enabled: true,
    });

    expect(response.status).toBe(200);
    expect(response.body.preferences).toEqual({
      weight_unit: "kg",
      distance_unit: "mi",
      home_metric: "none",
      sound_enabled: false,
      vibration_enabled: true,
      timer_notification_enabled: true,
    });

    // The next read gives the same thing back
    const me = await request(app)
      .get("/api/auth/me")
      .set("Cookie", user.cookie);
    expect(me.body.preferences.distance_unit).toBe("mi");
    expect(me.body.preferences.sound_enabled).toBe(false);
  });

  it("refuses an unknown column, an unknown value and an empty body", async () => {
    const user = await account();

    const unknownColumn = await patch(user.cookie, { password_hash: "x" });
    expect(unknownColumn.status).toBe(400);

    const unknownValue = await patch(user.cookie, { weight_unit: "stone" });
    expect(unknownValue.status).toBe(400);

    const empty = await patch(user.cookie, {});
    expect(empty.status).toBe(400);

    // The hash is untouched, and so are the preferences
    const [rows] = await client.execute<RowDataPacket[]>(
      "SELECT password_hash, weight_unit FROM `user` WHERE username = ?",
      [user.username],
    );
    expect(String(rows[0]?.password_hash)).toContain("argon2");
    expect(rows[0]?.weight_unit).toBe("kg");
  });

  it("refuses an anonymous visitor", async () => {
    const response = await request(app)
      .patch("/api/users/me/preferences")
      .set("Origin", ORIGIN)
      .send({ weight_unit: "lb" });

    expect(response.status).toBe(401);
  });
});

// The pool is shared by the whole file: it closes once, at the very end.
afterAll(async () => {
  await client.end();
});
