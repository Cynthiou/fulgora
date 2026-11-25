import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../../app.js";
import { signToken } from "../../utils/token.js";

describe("GET /api/workout-sessions/current", () => {
  it("answers 401 without a cookie", async () => {
    const response = await request(app).get("/api/workout-sessions/current");

    expect(response.status).toBe(401);
  });

  it("answers null for a connected user (no session can exist yet)", async () => {
    const response = await request(app)
      .get("/api/workout-sessions/current")
      .set("Cookie", `fulgora_token=${signToken(1)}`);

    expect(response.status).toBe(200);
    expect(response.body).toBeNull();
  });
});
