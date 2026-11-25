import { describe, expect, it } from "vitest";
import { readDuplicateKeyName } from "./errors.js";

describe("readDuplicateKeyName", () => {
  it("reads the key name, without the table prefix", () => {
    const error = {
      code: "ER_DUP_ENTRY",
      message: "Duplicate entry 'lea.m' for key 'user.uq_user_username'",
    };

    expect(readDuplicateKeyName(error)).toBe("uq_user_username");
  });

  it("also works without a table prefix", () => {
    const error = {
      code: "ER_DUP_ENTRY",
      message: "Duplicate entry 'x' for key 'uq_user_email'",
    };

    expect(readDuplicateKeyName(error)).toBe("uq_user_email");
  });

  it("returns null for any other error", () => {
    expect(readDuplicateKeyName(new Error("boom"))).toBeNull();
    expect(
      readDuplicateKeyName({ code: "ER_NO_SUCH_TABLE", message: "x" }),
    ).toBeNull();
    expect(readDuplicateKeyName(null)).toBeNull();
    expect(readDuplicateKeyName("ER_DUP_ENTRY")).toBeNull();
  });
});
