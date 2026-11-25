import { describe, expect, it } from "vitest";
import {
  escapeLike,
  exerciseQuerySchema,
  formatExerciseCount,
  formatExerciseMeta,
  formatMuscleRoleLabel,
  formatResultCount,
  getExerciseImage,
  getExerciseMuscleMap,
} from "../catalog.js";

describe("exerciseQuerySchema", () => {
  it("turns the offset into a number and accepts its absence", () => {
    expect(exerciseQuerySchema.parse({ offset: "40" })).toEqual({ offset: 40 });
    expect(exerciseQuerySchema.parse({})).toEqual({});
  });

  it.each(["-1", "1.5", "abc", ""])("refuses the offset %j", (offset) => {
    expect(exerciseQuerySchema.safeParse({ offset }).success).toBe(false);
  });

  it("reads the filters from their text form", () => {
    expect(
      exerciseQuerySchema.parse({
        search: "squat",
        category_ids: "5,2",
        equipment_ids: "4",
        difficulties: "beginner,advanced",
      }),
    ).toEqual({
      search: "squat",
      category_ids: [5, 2],
      equipment_ids: [4],
      difficulties: ["beginner", "advanced"],
    });
  });

  it("refuses a search of more than 60 characters", () => {
    expect(
      exerciseQuerySchema.safeParse({ search: "a".repeat(60) }).success,
    ).toBe(true);
    expect(
      exerciseQuerySchema.safeParse({ search: "a".repeat(61) }).success,
    ).toBe(false);
  });

  it.each(["0", "1,abc", "1,,2", "-3", "1,2,3,4,5,6,7,8,9,10,11"])(
    "refuses the id list %j",
    (category_ids) => {
      expect(exerciseQuerySchema.safeParse({ category_ids }).success).toBe(
        false,
      );
    },
  );

  it("refuses an unknown difficulty", () => {
    expect(
      exerciseQuerySchema.safeParse({ difficulties: "expert" }).success,
    ).toBe(false);
    expect(
      exerciseQuerySchema.safeParse({ difficulties: "beginner,expert" })
        .success,
    ).toBe(false);
  });
});

describe("escapeLike", () => {
  it("protects the LIKE wildcards and the backslash", () => {
    expect(escapeLike("50%")).toBe("50\\%");
    expect(escapeLike("a_b")).toBe("a\\_b");
    expect(escapeLike("c:\\dir")).toBe("c:\\\\dir");
    expect(escapeLike("squat")).toBe("squat");
  });
});

describe("formatResultCount", () => {
  it("writes the count, the search term and the active filters", () => {
    expect(formatResultCount(3, "squat", ["Jambes"])).toBe(
      "3 résultats pour « squat » · Jambes",
    );
    expect(formatResultCount(18, "", [])).toBe("18 résultats");
    expect(formatResultCount(1, "", ["Barre", "Haltères"])).toBe(
      "1 résultat · Barre · Haltères",
    );
    expect(formatResultCount(0, "squaat", [])).toBe(
      "0 résultats pour « squaat »",
    );
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

describe("formatMuscleRoleLabel", () => {
  it("agrees in number for each role", () => {
    expect(formatMuscleRoleLabel("primary", 1)).toBe("Principal");
    expect(formatMuscleRoleLabel("primary", 2)).toBe("Principaux");
    expect(formatMuscleRoleLabel("secondary", 1)).toBe("Secondaire");
    expect(formatMuscleRoleLabel("secondary", 3)).toBe("Secondaires");
  });
});

describe("getExerciseMuscleMap", () => {
  it("follows the profile, falls back on the other map, or gives null", () => {
    const both = {
      muscle_map_female_url: "/f.svg",
      muscle_map_male_url: "/m.svg",
    };
    expect(getExerciseMuscleMap(both, "male")).toBe("/m.svg");
    expect(getExerciseMuscleMap(both, null)).toBe("/f.svg");
    expect(
      getExerciseMuscleMap(
        { muscle_map_female_url: null, muscle_map_male_url: "/m.svg" },
        "female",
      ),
    ).toBe("/m.svg");
    expect(
      getExerciseMuscleMap(
        { muscle_map_female_url: null, muscle_map_male_url: null },
        "female",
      ),
    ).toBeNull();
  });
});
