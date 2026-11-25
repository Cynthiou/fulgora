import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { ExerciseListItem, PublicUser } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthContext,
  type AuthContextValue,
} from "../../../contexts/AuthContext";
import { ApiError } from "../../../services/apiError";
import { readExercises } from "../services/exerciseService";
import ExerciseListPage from "./ExerciseListPage";

vi.mock("../services/exerciseService", () => ({
  readExercises: vi.fn(),
}));
const readExercisesMock = vi.mocked(readExercises);

const lea: PublicUser = {
  id: 1,
  username: "lea.m",
  email: "lea@exemple.fr",
  sex: "female",
};

function exercise(id: number, name: string): ExerciseListItem {
  return {
    id,
    slug: `exercice-${id}`,
    name,
    difficulty: "intermediate",
    category_name: "Jambes",
    equipment_names: "Barre",
    image_female_url: `/images/${id}-female.jpg`,
    image_male_url: `/images/${id}-male.jpg`,
    is_personal: false,
  };
}

function page(from: number, to: number, total: number) {
  const items = [];
  for (let id = from; id <= to; id += 1) {
    items.push(exercise(id, `Exercice ${String(id).padStart(3, "0")}`));
  }
  return { items, total, next_offset: to < total ? to : null };
}

function renderCatalog() {
  const auth: AuthContextValue = {
    user: lea,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  };
  const router = createMemoryRouter(
    [{ path: "/catalogue", element: <ExerciseListPage /> }],
    { initialEntries: ["/catalogue"] },
  );
  render(
    <AuthContext.Provider value={auth}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  );
  return userEvent.setup();
}

describe("ExerciseListPage", () => {
  beforeEach(() => {
    readExercisesMock.mockReset();
    sessionStorage.clear();
  });

  it("announces the loading, then shows the count and the cards", async () => {
    readExercisesMock.mockResolvedValue(page(1, 20, 45));
    renderCatalog();

    expect(screen.getByRole("status").textContent).toBe(
      "Chargement des exercices",
    );

    expect(await screen.findByText("45 exercices")).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(20);
    expect(screen.getByText("Exercice 001")).toBeTruthy();
    expect(screen.getAllByText("Jambes · Intermédiaire")).toHaveLength(20);
    expect(screen.getAllByText("Barre")).toHaveLength(20);
    expect(readExercisesMock).toHaveBeenCalledWith(0, expect.anything());
  });

  it("links each card to its detail and uses the profile's illustration", async () => {
    readExercisesMock.mockResolvedValue(page(1, 2, 2));
    renderCatalog();

    const links = await screen.findAllByRole("link");
    expect(links[0]?.getAttribute("href")).toBe("/catalogue/1");
    expect(links[0]?.querySelector("img")?.getAttribute("src")).toBe(
      "/images/1-female.jpg",
    );
    expect(screen.getByText("Fin de la liste")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Charger plus" })).toBeNull();
  });

  it("shows a placeholder when the exercise has no illustration", async () => {
    const bare = {
      ...exercise(1, "Mon tirage"),
      image_female_url: null,
      image_male_url: null,
      is_personal: true,
    };
    readExercisesMock.mockResolvedValue({
      items: [bare],
      total: 1,
      next_offset: null,
    });
    renderCatalog();

    expect(await screen.findByText("Illustration non disponible")).toBeTruthy();
    expect(screen.getByText("Exercice personnel")).toBeTruthy();
  });

  it("loads the next 20 with « Charger plus » and keeps the first ones", async () => {
    readExercisesMock
      .mockResolvedValueOnce(page(1, 20, 45))
      .mockResolvedValueOnce(page(21, 40, 45))
      .mockResolvedValueOnce(page(41, 45, 45));
    const user = renderCatalog();
    await screen.findByText("45 exercices");

    await user.click(screen.getByRole("button", { name: "Charger plus" }));
    await waitFor(() => {
      expect(screen.getAllByRole("link")).toHaveLength(40);
    });
    expect(readExercisesMock).toHaveBeenLastCalledWith(20);

    await user.click(screen.getByRole("button", { name: "Charger plus" }));
    await waitFor(() => {
      expect(screen.getAllByRole("link")).toHaveLength(45);
    });
    expect(screen.queryByRole("button", { name: "Charger plus" })).toBeNull();
    expect(screen.getByText("Fin de la liste")).toBeTruthy();
  });

  it("shows the error with a retry when the first load fails", async () => {
    readExercisesMock
      .mockRejectedValueOnce(
        new ApiError(0, "NETWORK_ERROR", "Connexion impossible. Réessaie."),
      )
      .mockResolvedValueOnce(page(1, 3, 3));
    const user = renderCatalog();

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Impossible de charger les exercices",
    );

    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(await screen.findByText("3 exercices")).toBeTruthy();
  });

  it("keeps the cards and offers a retry when loading more fails", async () => {
    readExercisesMock
      .mockResolvedValueOnce(page(1, 20, 45))
      .mockRejectedValueOnce(
        new ApiError(0, "NETWORK_ERROR", "Connexion impossible. Réessaie."),
      )
      .mockResolvedValueOnce(page(21, 40, 45));
    const user = renderCatalog();
    await screen.findByText("45 exercices");

    await user.click(screen.getByRole("button", { name: "Charger plus" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Connexion impossible. Réessaie.",
    );
    expect(screen.getAllByRole("link")).toHaveLength(20);

    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    await waitFor(() => {
      expect(screen.getAllByRole("link")).toHaveLength(40);
    });
  });

  it("reloads as many cards as before when coming back to the list", async () => {
    sessionStorage.setItem(
      "catalogue:position",
      JSON.stringify({ loadedCount: 40, scrollY: 1200 }),
    );
    readExercisesMock
      .mockResolvedValueOnce(page(1, 20, 45))
      .mockResolvedValueOnce(page(21, 40, 45));
    renderCatalog();

    await waitFor(() => {
      expect(screen.getAllByRole("link")).toHaveLength(40);
    });
    expect(readExercisesMock).toHaveBeenCalledTimes(2);
  });
});
