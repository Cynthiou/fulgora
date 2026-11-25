import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import TabBar from "../../src/components/TabBar";

function renderAt(path: string) {
  const router = createMemoryRouter([{ path: "*", element: <TabBar /> }], {
    initialEntries: [path],
  });
  render(<RouterProvider router={router} />);
}

describe("TabBar", () => {
  it("shows the four tabs with a text label", () => {
    renderAt("/");

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Accueil",
      "Planning",
      "Suivi",
      "Catalogue",
    ]);
  });

  it("marks the current tab with aria-current", () => {
    renderAt("/planning");

    expect(
      screen
        .getByRole("link", { name: "Planning" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen
        .getByRole("link", { name: "Accueil" })
        .getAttribute("aria-current"),
    ).toBeNull();
  });

  it("only marks Accueil on the exact home path", () => {
    renderAt("/suivi/historique");

    expect(
      screen.getByRole("link", { name: "Suivi" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen
        .getByRole("link", { name: "Accueil" })
        .getAttribute("aria-current"),
    ).toBeNull();
  });
});
