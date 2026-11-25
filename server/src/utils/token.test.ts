import jwt from "jsonwebtoken";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readJwtSecret, signToken, verifyToken } from "./token.js";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("readJwtSecret", () => {
  const previous = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.JWT_SECRET = previous;
  });

  it("refuses a missing or short secret", () => {
    process.env.JWT_SECRET = "";
    expect(() => readJwtSecret()).toThrow("at least 32 characters");

    process.env.JWT_SECRET = "too-short";
    expect(() => readJwtSecret()).toThrow("at least 32 characters");
  });
});

describe("signToken / verifyToken", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("finds the user id back in a token it signed", () => {
    const token = signToken(42);

    expect(verifyToken(token)).toBe(42);
  });

  it("refuses a token signed with another secret", () => {
    const token = jwt.sign(
      { sub: "42" },
      "another-secret-of-at-least-32-chars!",
      {
        algorithm: "HS256",
        expiresIn: "7d",
      },
    );

    expect(verifyToken(token)).toBeNull();
  });

  it("refuses a tampered token", () => {
    const token = signToken(42);
    const [header, , signature] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ sub: "1" })).toString(
      "base64url",
    );

    expect(verifyToken(`${header}.${forgedPayload}.${signature}`)).toBeNull();
  });

  it("refuses garbage", () => {
    expect(verifyToken("not-a-token")).toBeNull();
    expect(verifyToken("")).toBeNull();
  });

  it("refuses a token older than 7 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-25T08:00:00Z"));
    const token = signToken(42);

    vi.setSystemTime(new Date(Date.now() + 6 * DAY_MS));
    expect(verifyToken(token)).toBe(42);

    vi.setSystemTime(new Date(Date.now() + 2 * DAY_MS));
    expect(verifyToken(token)).toBeNull();
  });
});
