import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router";
import type { ExerciseDetail, PublicUser } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthContext,
  type AuthContextValue,
} from "../../../contexts/AuthContext";
import { ApiError } from "../../../services/apiError";
import { readExercise } from "../services/exerciseService";
import ExerciseDetailPage from "./ExerciseDetailPage";

vi.mock("../services/exerciseService", () => ({
  readExercise: vi.fn(),
}));
const readExerciseMock = vi.mocked(readExercise);

const lea: PublicUser = {
  id: 1,
  username: "lea.m",
  email: "lea@exemple.fr",
  sex: "female",
};

const squat: ExerciseDetail = {
  id: 12,
  slug: "barbell-squat",
  name: "Squat à la barre",
  difficulty: "intermediate",
  is_personal: false,
  image_female_url: "/images/squat-female.jpg",
  image_male_url: "/images/squat-male.jpg",
  muscle_map_female_url: "/maps/squat-female.svg",
  muscle_map_male_url: "/maps/squat-male.svg",
  categories: ["Jambes"],
  equipments: ["Barre"],
  muscles: [
    { name: "Quadriceps", role: "primary" },
    { name: "Fessiers", role: "primary" },
    { name: "Ischio-jambiers", role: "secondary" },
    { name: "Mollets", role: "secondary" },
  ],
  measures: [
    { code: "reps", label: "Répétitions" },
    { code: "weight", label: "Charge" },
  ],
  instructions: ["Place la barre.", "Descends.", "Remonte."],
  mistakes: ["Dos rond.", "Talons levés."],
  alternatives: ["Goblet squat.", "Presse à cuisses."],
};

// Shows what the editor receives through the navigation state.
function EditorStub() {
  const location = useLocation();
  const state = location.state as { exercises?: { name: string }[] } | null;
  return (
    <p>
      Page nouvelle séance ·{" "}
      {state?.exercises?.map((exercise) => exercise.name).join(", ")}
    </p>
  );
}

function renderDetail(initialState?: { name: string; selection?: string }) {
  const auth: AuthContextValue = {
    user: lea,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  };
  const router = createMemoryRouter(
    [
      { path: "/catalogue", element: <p>Page catalogue</p> },
      { path: "/catalogue/:id", element: <ExerciseDetailPage /> },
      { path: "/seances/nouvelle", element: <EditorStub /> },
    ],
    {
      initialEntries: [
        "/catalogue",
        { pathname: "/catalogue/12", state: initialState ?? null },
      ],
      initialIndex: 1,
    },
  );
  render(
    <AuthContext.Provider value={auth}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  );
  return userEvent.setup();
}

describe("ExerciseDetailPage", () => {
  beforeEach(() => {
    readExerciseMock.mockReset();
  });

  it("shows the known name while loading, with the add button disabled", () => {
    readExerciseMock.mockReturnValue(new Promise(() => {}));
    renderDetail({ name: "Squat à la barre" });

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Squat à la barre",
    );
    expect(screen.getByRole("status").textContent).toContain(
      "Chargement de la fiche",
    );
    const button = screen.getByRole("button", {
      name: "Ajouter à une séance",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(readExerciseMock).toHaveBeenCalledWith(12, expect.anything());
  });

  it("shows the whole detail with primary and secondary muscles", async () => {
    readExerciseMock.mockResolvedValue(squat);
    renderDetail();

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Squat à la barre",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Jambes")).toBeTruthy();
    expect(screen.getByText("Intermédiaire")).toBeTruthy();
    expect(screen.getByText("Barre")).toBeTruthy();

    expect(screen.getByText("Principaux")).toBeTruthy();
    expect(screen.getByText("Quadriceps · Fessiers")).toBeTruthy();
    expect(screen.getByText("Secondaires")).toBeTruthy();
    expect(screen.getByText("Ischio-jambiers · Mollets")).toBeTruthy();
    expect(
      screen
        .getByRole("img", { name: /Quadriceps · Fessiers/ })
        .getAttribute("src"),
    ).toBe("/maps/squat-female.svg");

    expect(screen.getByText("Place la barre.").closest("ol")).not.toBeNull();
    expect(screen.getByText("Dos rond.")).toBeTruthy();
    expect(screen.getByText("Goblet squat.")).toBeTruthy();
    expect(screen.getByText("Répétitions")).toBeTruthy();
    expect(screen.getByText("Charge")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Ajouter à une séance",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });

  it("offers a new free session as destination and hands the exercise over", async () => {
    readExerciseMock.mockResolvedValue(squat);
    const user = renderDetail();
    await screen.findByText("Quadriceps · Fessiers");

    await user.click(
      screen.getByRole("button", { name: "Ajouter à une séance" }),
    );

    expect(screen.getByText("Ajouter 1 exercice")).toBeTruthy();
    expect(screen.getByText("Nouvelle séance libre")).toBeTruthy();
    expect(screen.getByText("Tu choisiras la date ensuite")).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Continuer vers l'éditeur" }),
    );

    expect(
      await screen.findByText("Page nouvelle séance · Squat à la barre"),
    ).toBeTruthy();
  });

  it("adds to the selection and goes back when opened from a selection", async () => {
    sessionStorage.clear();
    readExerciseMock.mockResolvedValue(squat);
    const user = renderDetail({
      name: "Squat à la barre",
      selection: "block:b1",
    });
    await screen.findByText("Quadriceps · Fessiers");
    expect(
      screen.getByRole("button", { name: "Retour à la sélection" }),
    ).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Ajouter à la sélection" }),
    );

    expect(await screen.findByText("Page catalogue")).toBeTruthy();
    expect(
      JSON.parse(sessionStorage.getItem("catalogue:selection:block:b1") ?? ""),
    ).toEqual({
      active: true,
      items: [
        {
          exercise_id: 12,
          name: "Squat à la barre",
          measure_codes: ["reps", "weight"],
        },
      ],
    });
  });

  it("uses the singular for one primary muscle and hides empty alternatives", async () => {
    readExerciseMock.mockResolvedValue({
      ...squat,
      name: "Mon tirage élastique",
      is_personal: true,
      image_female_url: null,
      image_male_url: null,
      muscle_map_female_url: null,
      muscle_map_male_url: null,
      muscles: [
        { name: "Dorsaux", role: "primary" },
        { name: "Biceps", role: "secondary" },
      ],
      alternatives: [],
    });
    renderDetail();

    expect(await screen.findByText("Exercice personnel")).toBeTruthy();
    expect(screen.getByText("Principal")).toBeTruthy();
    expect(screen.getByText("Secondaire")).toBeTruthy();
    expect(screen.queryByText("Exercices alternatifs")).toBeNull();
    expect(
      screen.getByRole("img", {
        name: "Mon tirage élastique, illustration non disponible",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Illustration non disponible")).toBeTruthy();
    // No muscle map: the muscles are written only.
    expect(screen.queryByRole("img", { name: /Dorsaux/ })).toBeNull();
    expect(screen.getByText("Dorsaux")).toBeTruthy();
  });

  it("says the exercise is not found and offers the catalog", async () => {
    readExerciseMock.mockRejectedValue(
      new ApiError(404, "NOT_FOUND", "Exercice introuvable."),
    );
    renderDetail();

    expect(await screen.findByText("Exercice introuvable")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Retour au catalogue" })
        .getAttribute("href"),
    ).toBe("/catalogue");
    expect(screen.queryByText("Ajouter à une séance")).toBeNull();
  });

  it("shows the error with a retry and keeps the back arrow", async () => {
    readExerciseMock
      .mockRejectedValueOnce(
        new ApiError(0, "NETWORK_ERROR", "Connexion impossible. Réessaie."),
      )
      .mockResolvedValueOnce(squat);
    const user = renderDetail({ name: "Squat à la barre" });

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Impossible de charger la fiche",
    );
    expect(screen.queryByText("Ajouter à une séance")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Retour au catalogue" }),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(await screen.findByText("Quadriceps · Fessiers")).toBeTruthy();
  });

  it("goes back to the catalog with the arrow", async () => {
    readExerciseMock.mockResolvedValue(squat);
    const user = renderDetail();
    await screen.findByText("Quadriceps · Fessiers");

    await user.click(
      screen.getByRole("button", { name: "Retour au catalogue" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Page catalogue")).toBeTruthy();
    });
  });
});
