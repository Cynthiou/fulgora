import { describe, expect, it } from "vitest";
import {
  exerciseQuerySchema,
  formatExerciseCount,
  formatExerciseMeta,
  getExerciseImage,
} from "./catalog.js";

describe("exerciseQuerySchema", () => {
  it("turns the offset into a number and accepts its absence", () => {
    expect(exerciseQuerySchema.parse({ offset: "40" })).toEqual({ offset: 40 });
    expect(exerciseQuerySchema.parse({})).toEqual({});
  });

  it.each(["-1", "1.5", "abc", ""])("refuses the offset %j", (offset) => {
    expect(exerciseQuerySchema.safeParse({ offset }).success).toBe(false);
  });
});

describe("getExerciseImage", () => {
  const both = {
    image_female_url: "/f.jpg",
    image_male_url: "/m.jpg",
  };

  it("follows the profile's choice", () => {
    expect(getExerciseImage(both, "female")).toBe("/f.jpg");
    expect(getExerciseImage(both, "male")).toBe("/m.jpg");
  });

  it("falls back on the other illustration when the chosen one is missing", () => {
    expect(
      getExerciseImage(
        { image_female_url: null, image_male_url: "/m.jpg" },
        "female",
      ),
    ).toBe("/m.jpg");
    expect(
      getExerciseImage(
        { image_female_url: "/f.jpg", image_male_url: null },
        "male",
      ),
    ).toBe("/f.jpg");
  });

  it("gives null when there is no illustration at all", () => {
    expect(
      getExerciseImage(
        { image_female_url: null, image_male_url: null },
        "female",
      ),
    ).toBeNull();
  });

  it("starts with the female illustration when nothing is chosen yet", () => {
    expect(getExerciseImage(both, null)).toBe("/f.jpg");
  });
});

describe("formatExerciseMeta", () => {
  it("joins the group and the difficulty in French", () => {
    expect(formatExerciseMeta("Jambes", "intermediate")).toBe(
      "Jambes · Intermédiaire",
    );
    expect(formatExerciseMeta(null, "beginner")).toBe("Débutant");
    expect(formatExerciseMeta("Cardio", "advanced")).toBe("Cardio · Avancé");
  });
});

describe("formatExerciseCount", () => {
  it("agrees in number", () => {
    expect(formatExerciseCount(151)).toBe("151 exercices");
    expect(formatExerciseCount(1)).toBe("1 exercice");
    expect(formatExerciseCount(0)).toBe("0 exercices");
  });
});
