import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import { AuthContext, type AuthContextValue } from "../contexts/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

// The login page shows where the visitor was sent from.
function FakeLoginPage() {
  const location = useLocation();
  const state = location.state as { from?: string } | null;
  return <p>Page connexion, venue de {state?.from}</p>;
}

function renderAt(path: string, auth: Partial<AuthContextValue>) {
  const value: AuthContextValue = {
    user: null,
    isLoading: false,
    login: () => {},
    logout: () => {},
    ...auth,
  };
  const router = createMemoryRouter(
    [
      { path: "/connexion", element: <FakeLoginPage /> },
      {
        element: <ProtectedRoute />,
        children: [{ path: "/planning", element: <p>Page privée</p> }],
      },
    ],
    { initialEntries: [path] },
  );
  return render(
    <AuthContext.Provider value={value}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  );
}

describe("ProtectedRoute", () => {
  it("shows the private page to a connected user", () => {
    renderAt("/planning?semaine=48", {
      user: { id: 1, username: "lea.m", email: "lea@exemple.fr", sex: null },
    });

    expect(screen.getByText("Page privée")).toBeTruthy();
  });

  it("sends a visitor to the login page and remembers where they were", () => {
    renderAt("/planning?semaine=48", { user: null });

    expect(
      screen.getByText("Page connexion, venue de /planning?semaine=48"),
    ).toBeTruthy();
  });

  it("shows the loading state while the user is unknown", () => {
    renderAt("/planning", { isLoading: true });

    expect(screen.getByRole("status").textContent).toBe("Chargement…");
    expect(screen.queryByText("Page privée")).toBeNull();
  });
});
