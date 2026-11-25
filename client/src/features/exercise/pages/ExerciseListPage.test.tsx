import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router";
import type { ExerciseListItem, PublicUser } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthContext,
  type AuthContextValue,
} from "../../../contexts/AuthContext";
import { ApiError } from "../../../services/apiError";
import {
  readCategories,
  readEquipments,
  readExercises,
} from "../services/exerciseService";
import ExerciseListPage from "./ExerciseListPage";

vi.mock("../services/exerciseService", async () => {
  const actual = await vi.importActual<
    typeof import("../services/exerciseService")
  >("../services/exerciseService");
  return {
    toSearchParams: actual.toSearchParams,
    readExercises: vi.fn(),
    readCategories: vi.fn(),
    readEquipments: vi.fn(),
  };
});
const readExercisesMock = vi.mocked(readExercises);
const readCategoriesMock = vi.mocked(readCategories);
const readEquipmentsMock = vi.mocked(readEquipments);

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
    measure_codes: ["reps", "weight"],
  };
}

function page(from: number, to: number, total: number) {
  const items = [];
  for (let id = from; id <= to; id += 1) {
    items.push(exercise(id, `Exercice ${String(id).padStart(3, "0")}`));
  }
  return { items, total, next_offset: to < total ? to : null };
}

// Shows the current address, to check what the filters wrote in it.
function AddressBar() {
  const location = useLocation();
  return <span data-testid="address">{location.search}</span>;
}

function renderCatalog(search = "") {
  const auth: AuthContextValue = {
    user: lea,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  };
  const router = createMemoryRouter(
    [
      {
        path: "/catalogue",
        element: (
          <>
            <ExerciseListPage />
            <AddressBar />
          </>
        ),
      },
    ],
    { initialEntries: [`/catalogue${search}`] },
  );
  render(
    <AuthContext.Provider value={auth}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  );
  return userEvent.setup();
}

function address(): string {
  return screen.getByTestId("address").textContent ?? "";
}

describe("ExerciseListPage", () => {
  beforeEach(() => {
    readExercisesMock.mockReset();
    readCategoriesMock.mockReset();
    readEquipmentsMock.mockReset();
    readCategoriesMock.mockResolvedValue([
      { id: 5, code: "legs", name: "Jambes" },
      { id: 1, code: "chest", name: "Pectoraux" },
    ]);
    readEquipmentsMock.mockResolvedValue([
      { id: 4, code: "barbell", name: "Barre" },
    ]);
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
    expect(readExercisesMock).toHaveBeenCalledWith(
      { offset: 0 },
      expect.anything(),
    );
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
    expect(readExercisesMock).toHaveBeenLastCalledWith({ offset: 20 });

    await user.click(screen.getByRole("button", { name: "Charger plus" }));
    await waitFor(() => {
      expect(screen.getAllByRole("link")).toHaveLength(45);
    });
    expect(screen.queryByRole("button", { name: "Charger plus" })).toBeNull();
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

  it("reloads as many cards as before when coming back with the same filters", async () => {
    sessionStorage.setItem(
      "catalogue:position",
      JSON.stringify({ search: "", loadedCount: 40, scrollY: 1200 }),
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

  it("searches 300 ms after the last letter, writes it in the address and in bold", async () => {
    readExercisesMock
      .mockResolvedValueOnce(page(1, 20, 45))
      .mockResolvedValueOnce({
        items: [exercise(7, "Squat gobelet"), exercise(8, "Squat front")],
        total: 2,
        next_offset: null,
      });
    const user = renderCatalog();
    await screen.findByText("45 exercices");

    await user.type(screen.getByRole("searchbox"), "squat");

    expect(await screen.findByText("2 résultats pour « squat »")).toBeTruthy();
    expect(address()).toBe("?search=squat");
    expect(readExercisesMock).toHaveBeenLastCalledWith(
      { search: "squat", offset: 0 },
      expect.anything(),
    );
    expect(screen.getAllByText("Squat").map((e) => e.tagName)).toEqual([
      "STRONG",
      "STRONG",
    ]);
    // One request for the whole word, not one per letter.
    expect(readExercisesMock).toHaveBeenCalledTimes(2);

    await user.click(
      screen.getByRole("button", { name: "Effacer le champ de recherche" }),
    );
    expect(address()).toBe("");
  });

  it("opens one grid at a time and filters by group, with a chip to remove it", async () => {
    readExercisesMock.mockResolvedValue(page(1, 5, 5));
    const user = renderCatalog();
    await screen.findByText("5 exercices");

    const groupToggle = screen.getByRole("button", { name: /^Groupe/ });
    await user.click(groupToggle);
    expect(groupToggle.getAttribute("aria-expanded")).toBe("true");
    const legs = await screen.findByRole("button", { name: /Jambes/ });
    expect(legs.getAttribute("aria-pressed")).toBe("false");

    await user.click(legs);

    expect(address()).toBe("?category_ids=5");
    expect(legs.getAttribute("aria-pressed")).toBe("true");
    expect(legs.textContent).toContain("✓");
    expect(groupToggle.textContent).toBe("Groupe1");
    expect(await screen.findByText("5 résultats · Jambes")).toBeTruthy();
    expect(readExercisesMock).toHaveBeenLastCalledWith(
      { category_ids: [5], offset: 0 },
      expect.anything(),
    );

    // Another toggle closes the first grid.
    await user.click(screen.getByRole("button", { name: /^Matériel/ }));
    expect(groupToggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("group", { name: "Matériel" })).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Retirer le filtre Jambes" }),
    );
    expect(address()).toBe("");
  });

  it("reads the filters from the address and clears them all", async () => {
    readExercisesMock.mockResolvedValue(page(1, 3, 3));
    const user = renderCatalog(
      "?category_ids=5&equipment_ids=4&difficulties=beginner",
    );
    await screen.findByText("3 résultats · Jambes · Barre · Débutant");

    expect(readExercisesMock).toHaveBeenCalledWith(
      {
        category_ids: [5],
        equipment_ids: [4],
        difficulties: ["beginner"],
        offset: 0,
      },
      expect.anything(),
    );

    await user.click(screen.getByRole("button", { name: "Tout effacer" }));

    expect(address()).toBe("");
  });

  it("shows the no result screen with its two buttons", async () => {
    readExercisesMock.mockResolvedValue({
      items: [],
      total: 0,
      next_offset: null,
    });
    const user = renderCatalog("?search=squaat&difficulties=advanced");

    expect(
      await screen.findByText("Aucun exercice trouvé pour « squaat »"),
    ).toBeTruthy();
    expect(
      screen.getByText("Vérifie l'orthographe ou retire un filtre."),
    ).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Réinitialiser les filtres" }),
    );
    expect(address()).toBe("?search=squaat");

    await user.click(
      screen.getByRole("button", { name: "Effacer la recherche" }),
    );
    expect(address()).toBe("");
  });
});
