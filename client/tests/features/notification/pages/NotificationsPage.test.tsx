import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { NotificationItem } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotificationBell from "../../../../src/features/notification/components/NotificationBell";
import NotificationsPage from "../../../../src/features/notification/pages/NotificationsPage";
import {
  markAllNotificationsRead,
  markNotificationRead,
  readNotifications,
} from "../../../../src/features/notification/services/notificationService";

vi.mock(
  "../../../../src/features/notification/services/notificationService",
  () => ({
    readNotifications: vi.fn(),
    readUnreadCount: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  }),
);
const readMock = vi.mocked(readNotifications);
const readOneMock = vi.mocked(markNotificationRead);
const readAllMock = vi.mocked(markAllNotificationsRead);

const now = new Date();
const twoDaysAgo = new Date(now.getTime() - 2 * 86_400_000).toISOString();
const tenDaysAgo = new Date(now.getTime() - 10 * 86_400_000).toISOString();

function notification(
  overrides: Partial<NotificationItem> & { id: number },
): NotificationItem {
  return {
    type: "session_to_confirm",
    title: "Séance à confirmer",
    message: "Dos · mar. 24 nov.",
    created_at: twoDaysAgo,
    read_at: null,
    appointment_id: 12,
    program_id: null,
    exercise_id: null,
    ...overrides,
  };
}

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: "/notifications", element: <NotificationsPage /> },
      { path: "*", element: <p>Autre page</p> },
    ],
    { initialEntries: ["/notifications"] },
  );
  render(<RouterProvider router={router} />);
  return userEvent.setup();
}

describe("NotificationsPage (NOT-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("groups the notifications and says which ones are unread", async () => {
    readMock.mockResolvedValue({
      items: [
        notification({ id: 1 }),
        notification({
          id: 2,
          type: "personal_record",
          title: "Record personnel",
          created_at: tenDaysAgo,
          read_at: tenDaysAgo,
          appointment_id: null,
        }),
      ],
      unread_count: 1,
    });
    renderPage();

    expect(await screen.findByText("Cette semaine")).toBeTruthy();
    expect(screen.getByText("Plus anciennes")).toBeTruthy();
    // The state is told in words, never by the colour alone
    expect(screen.getByText("Non lue")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Séance à confirmer/ }),
    ).toBeTruthy();
  });

  it("reads one notification when it is opened", async () => {
    readMock.mockResolvedValue({
      items: [notification({ id: 7 })],
      unread_count: 1,
    });
    readOneMock.mockResolvedValue({ unread_count: 0 });
    const user = renderPage();
    await screen.findByText("Cette semaine");

    await user.click(screen.getByRole("link", { name: /Séance à confirmer/ }));

    expect(readOneMock).toHaveBeenCalledWith(7);
  });

  it("marks everything read at once", async () => {
    readMock.mockResolvedValue({
      items: [notification({ id: 1 }), notification({ id: 2 })],
      unread_count: 2,
    });
    readAllMock.mockResolvedValue(undefined);
    const user = renderPage();
    await screen.findByText("Cette semaine");

    await user.click(screen.getByRole("button", { name: "Tout marquer lu" }));

    expect(readAllMock).toHaveBeenCalled();
    expect(screen.queryByText("Non lue")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Tout marquer lu" }),
    ).toBeNull();
  });

  it("says what will land here when the list is empty", async () => {
    readMock.mockResolvedValue({ items: [], unread_count: 0 });
    renderPage();

    expect(await screen.findByText("Aucune notification")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Tout marquer lu" }),
    ).toBeNull();
  });
});

describe("NotificationBell (NOT-01)", () => {
  function renderBell(count: number) {
    const router = createMemoryRouter(
      [{ path: "/", element: <NotificationBell unreadCount={count} /> }],
      { initialEntries: ["/"] },
    );
    render(<RouterProvider router={router} />);
  }

  it("counts the unread ones, and stops at 9+", () => {
    renderBell(12);
    expect(
      screen.getByRole("link", { name: "Notifications, 12 non lues" }),
    ).toBeTruthy();
    expect(screen.getByText("9+")).toBeTruthy();
  });

  it("shows no badge without any unread one", () => {
    renderBell(0);
    expect(screen.getByRole("link", { name: "Notifications" })).toBeTruthy();
    expect(screen.queryByText("0")).toBeNull();
  });
});
