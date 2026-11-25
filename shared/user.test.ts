import { describe, expect, it } from "vitest";
import {
  EMAIL_MESSAGE,
  getInitials,
  PASSWORD_MESSAGE,
  REQUIRED_MESSAGE,
  signupSchema,
  TERMS_MESSAGE,
  USERNAME_MESSAGE,
} from "./user.js";

const valid = {
  username: "lea.m",
  email: "lea.martin@mail.fr",
  password: "secret-2026",
  terms_accepted: true,
};

// The message of the first issue for a field, or undefined when valid.
function messageFor(input: unknown, field: string): string | undefined {
  const result = signupSchema.safeParse(input);
  if (result.success) {
    return undefined;
  }
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe("getInitials", () => {
  it("takes the first letter of the first two parts", () => {
    expect(getInitials("lucas_m")).toBe("LM");
    expect(getInitials("lea.martin")).toBe("LM");
    expect(getInitials("jean-paul.d")).toBe("JP");
  });

  it("takes the first two letters of a single word", () => {
    expect(getInitials("lea")).toBe("LE");
    expect(getInitials("x")).toBe("X");
  });
});

describe("signupSchema", () => {
  it("accepts a complete form and drops unknown fields", () => {
    const result = signupSchema.parse({ ...valid, role: "admin" });

    expect(result).toEqual(valid);
  });

  it("stores the e-mail in lowercase", () => {
    const result = signupSchema.parse({
      ...valid,
      email: "Lea.Martin@Mail.FR",
    });

    expect(result.email).toBe("lea.martin@mail.fr");
  });

  it("gives one single message for an empty field", () => {
    const result = signupSchema.safeParse({ ...valid, username: "" });

    expect(result.success).toBe(false);
    const usernameIssues = result.error?.issues.filter(
      (issue) => issue.path[0] === "username",
    );
    expect(usernameIssues?.map((issue) => issue.message)).toEqual([
      REQUIRED_MESSAGE,
    ]);
  });

  it.each(["le a", "ab", "a".repeat(31), "léa", "lea@m"])(
    "refuses the username %j",
    (username) => {
      expect(messageFor({ ...valid, username }, "username")).toBe(
        USERNAME_MESSAGE,
      );
    },
  );

  it.each(["lea.m", "lea_m-2", "ABC"])(
    "accepts the username %j",
    (username) => {
      expect(messageFor({ ...valid, username }, "username")).toBeUndefined();
    },
  );

  it.each(["lea", "lea@", "@mail.fr", "lea mail.fr"])(
    "refuses the e-mail %j",
    (email) => {
      expect(messageFor({ ...valid, email }, "email")).toBe(EMAIL_MESSAGE);
    },
  );

  it("refuses a password without a digit", () => {
    expect(messageFor({ ...valid, password: "abcdefgh" }, "password")).toBe(
      PASSWORD_MESSAGE,
    );
  });

  it("refuses a password of 7 characters", () => {
    expect(messageFor({ ...valid, password: "abcde12" }, "password")).toBe(
      PASSWORD_MESSAGE,
    );
  });

  it("accepts a password of 8 characters with a digit", () => {
    expect(
      messageFor({ ...valid, password: "abcdef12" }, "password"),
    ).toBeUndefined();
  });

  it("refuses unchecked or missing terms", () => {
    expect(
      messageFor({ ...valid, terms_accepted: false }, "terms_accepted"),
    ).toBe(TERMS_MESSAGE);
    const { terms_accepted: _ignored, ...withoutTerms } = valid;
    expect(messageFor(withoutTerms, "terms_accepted")).toBe(TERMS_MESSAGE);
  });

  it("lists every missing field at once", () => {
    const result = signupSchema.safeParse({});

    expect(result.success).toBe(false);
    const fields = result.error?.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(["username", "email", "password", "terms_accepted"]);
  });
});
