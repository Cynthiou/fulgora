import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import app from "../../../src/app.js";
import client from "../../../src/database/client.js";
import { authLimiterStore } from "../../../src/middlewares/rateLimiters.js";

const ORIGIN = "http://localhost:3000";
const PREFIX = "test_login_";
const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

// One account for the whole file, created through the real signup route.
const account = {
  username: `${PREFIX}${stamp}`,
  email: `${PREFIX}${stamp}@exemple.fr`,
  password: "secret-2026",
  terms_accepted: true,
};

function login(body: object) {
  return request(app).post("/api/auth/login").set("Origin", ORIGIN).send(body);
}

function readSetCookie(headers: Record<string, unknown>): string {
  const value = headers["set-cookie"];
  return Array.isArray(value) ? String(value[0]) : String(value);
}

// "fulgora_token=abc; Path=/; ..." -> "fulgora_token=abc"
function cookiePair(setCookie: string): string {
  return setCookie.split(";")[0] ?? "";
}

beforeAll(async () => {
  await authLimiterStore.resetAll();
  const response = await request(app)
    .post("/api/users")
    .set("Origin", ORIGIN)
    .send(account);
  expect(response.status).toBe(201);
});

beforeEach(async () => {
  await authLimiterStore.resetAll();
});

afterAll(async () => {
  await client.execute("DELETE FROM `user` WHERE username LIKE ?", [
    `${PREFIX}%`,
  ]);
  await client.end();
});

describe("POST /api/auth/login", () => {
  it("logs in with the username and never returns the hash", async () => {
    const response = await login({
      identifier: account.username,
      password: account.password,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(Number),
      username: account.username,
      email: account.email,
      sex: null,
    });
    expect(JSON.stringify(response.body)).not.toContain("argon2");
    expect(readSetCookie(response.headers)).toContain("fulgora_token=");
  });

  it("logs in with the e-mail, even typed in capitals", async () => {
    const response = await login({
      identifier: account.email.toUpperCase(),
      password: account.password,
    });

    expect(response.status).toBe(200);
    expect(response.body.username).toBe(account.username);
  });

  it("refuses a wrong password with 401", async () => {
    const response = await login({
      identifier: account.username,
      password: "wrong-2026",
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toEqual({
      code: "INVALID_CREDENTIALS",
      message: "Identifiants incorrects. Vérifie ta saisie et réessaie.",
    });
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("answers exactly the same for an unknown account", async () => {
    const wrongPassword = await login({
      identifier: account.username,
      password: "wrong-2026",
    });
    const unknown = await login({
      identifier: "nobody_at_all",
      password: "wrong-2026",
    });

    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrongPassword.body);
  });

  it("answers 400 for empty fields", async () => {
    const response = await login({ identifier: "", password: "" });

    expect(response.status).toBe(400);
    expect(response.body.error.fields).toHaveLength(2);
  });

  it("answers 429 on the 6th try", async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await login({ identifier: account.username, password: "wrong-2026" });
    }

    const response = await login({
      identifier: account.username,
      password: account.password,
    });

    expect(response.status).toBe(429);
  });
});

describe("GET /api/auth/me", () => {
  it("answers 401 without a cookie", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns the connected user with the login cookie", async () => {
    const loggedIn = await login({
      identifier: account.username,
      password: account.password,
    });

    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookiePair(readSetCookie(loggedIn.headers)));

    expect(response.status).toBe(200);
    expect(response.body).toEqual(loggedIn.body);
  });
});

describe("POST /api/auth/logout", () => {
  it("expires the cookie, so the next /me answers 401", async () => {
    // An agent behaves like a browser: it keeps the cookies it receives,
    // and drops a cookie that has expired.
    const browser = request.agent(app);
    const loggedIn = await browser
      .post("/api/auth/login")
      .set("Origin", ORIGIN)
      .send({ identifier: account.username, password: account.password });
    expect(loggedIn.status).toBe(200);
    expect((await browser.get("/api/auth/me")).status).toBe(200);

    const response = await browser
      .post("/api/auth/logout")
      .set("Origin", ORIGIN);

    expect(response.status).toBe(204);
    const cookie = readSetCookie(response.headers);
    expect(cookie).toContain("fulgora_token=;");
    expect(cookie).toContain("Expires=Thu, 01 Jan 1970");
    expect((await browser.get("/api/auth/me")).status).toBe(401);
  });

  it("answers 401 without a cookie", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("Origin", ORIGIN);

    expect(response.status).toBe(401);
  });

  it("answers 403 without an allowed origin", async () => {
    const response = await request(app).post("/api/auth/logout");

    expect(response.status).toBe(403);
  });
});
