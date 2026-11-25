import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("hashPassword", () => {
  it("produces an Argon2id hash with the expected cost", async () => {
    const hash = await hashPassword("correct horse 42");

    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(hash).toContain("m=19456,t=2,p=1");
  });

  it("never gives the same hash twice (random salt)", async () => {
    const first = await hashPassword("same password 1");
    const second = await hashPassword("same password 1");

    expect(first).not.toBe(second);
  });
});

describe("verifyPassword", () => {
  it("accepts the right password and refuses a wrong one", async () => {
    const hash = await hashPassword("correct horse 42");

    expect(await verifyPassword(hash, "correct horse 42")).toBe(true);
    expect(await verifyPassword(hash, "wrong horse 42")).toBe(false);
  });
});
