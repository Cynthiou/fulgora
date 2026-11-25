import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { HistoryItem } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TrackingPage from "../../../../src/features/history/pages/TrackingPage";
import { readHistory } from "../../../../src/features/history/services/historyService";
import { ApiError } from "../../../../src/services/apiError";

vi.mock("../../../../src/features/history/services/historyService", () => ({
  readHistory: vi.fn(),
}));
const readMock = vi.mocked(readHistory);

function item(overrides: Partial<HistoryItem>): HistoryItem {
  return {
    appointment_id: 1,
    history_date: "2026-11-26",
    planned_date: "2026-11-26",
    planned_time: "07:00",
    initial_date: null,
    moved_manually: false,
    appointment_status: "attended",
    session_name: "Réveil musculaire",
    program_name: null,
    workout: {
      id: 1,
      status: "completed",
      started_at: "2026-11-26T06:02:00.000Z",
    },
    ...overrides,
  };
}

function renderPage() {
  const router = createMemoryRouter(
    [{ path: "/suivi", element: <TrackingPage /> }],
    { initialEntries: ["/suivi"] },
  );
  render(<RouterProvider router={router} />);
  return userEvent.setup();
}

describe("TrackingPage", () => {
  beforeEach(() => {
    readMock.mockReset();
  });

  it("groups the past sessions by week with their status and notes", async () => {
    readMock.mockResolvedValue({
      items: [
        item({}),
        item({
          appointment_id: 2,
          history_date: "2026-11-24",
          planned_date: "2026-11-24",
          session_name: "Dos",
          appointment_status: "to_confirm",
          workout: null,
          moved_manually: true,
          initial_date: "2026-11-21",
        }),
        item({
          appointment_id: 3,
          history_date: "2026-11-17",
          planned_date: "2026-11-19",
          session_name: "Haut du corps",
          program_name: "Force 8 semaines",
        }),
      ],
      has_more: false,
    });
    renderPage();

    expect(await screen.findByText("Semaine du 23 nov.")).toBeTruthy();
    expect(screen.getByText("Semaine du 16 nov.")).toBeTruthy();
    // The link is named by its content: the full date, then the line
    expect(
      screen.getByRole("link", { name: /Réveil musculaire.*Effectuée/ })
        .textContent,
    ).toContain("Jeudi 26 novembre");
    expect(
      screen
        .getByRole("link", { name: /Dos.*À confirmer/ })
        .getAttribute("href"),
    ).toBe("/suivi/historique/2");
    // One line per session: "Séance libre · ↷ déplacée du 21" (SUI-05).
    expect(screen.getByText("Séance libre · ↷ déplacée du 21")).toBeTruthy();
    expect(screen.getByText(/Prévue le 19/)).toBeTruthy();
    expect(screen.getByText(/Force 8 semaines/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Charger plus" })).toBeNull();
  });

  it("loads the next 20 and keeps the first ones when loading more fails", async () => {
    readMock
      .mockResolvedValueOnce({ items: [item({})], has_more: true })
      .mockRejectedValueOnce(
        new ApiError(0, "NETWORK_ERROR", "Connexion impossible. Réessaie."),
      )
      .mockResolvedValueOnce({
        items: [item({ appointment_id: 9, session_name: "Jambes" })],
        has_more: false,
      });
    const user = renderPage();
    await screen.findByText("Réveil musculaire");

    await user.click(screen.getByRole("button", { name: "Charger plus" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Connexion impossible. Réessaie.",
    );
    expect(screen.getByText("Réveil musculaire")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByText("Jambes")).toBeTruthy();
    expect(readMock).toHaveBeenLastCalledWith(1);
    expect(screen.queryByRole("button", { name: "Charger plus" })).toBeNull();
  });

  it("shows the empty screen, and the error with a retry", async () => {
    readMock.mockResolvedValue({ items: [], has_more: false });
    renderPage();
    expect(await screen.findByText("Aucune séance passée")).toBeTruthy();

    readMock.mockRejectedValue(
      new ApiError(0, "NETWORK_ERROR", "Connexion impossible. Réessaie."),
    );
    renderPage();
    expect(
      (await screen.findAllByRole("alert")).some((alert) =>
        alert.textContent?.includes("Impossible de charger ton historique."),
      ),
    ).toBe(true);
  });
});
