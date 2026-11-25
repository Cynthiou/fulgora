import { useState } from "react";
import { useNavigate } from "react-router";
import type { CurrentWorkoutSession } from "shared";
import { useAuth } from "../../../hooks/useAuth";
import { readCurrentWorkoutSession } from "../../workout-session/services/workoutSessionService";
import { logout as logoutRequest } from "../services/authService";

export const LOGOUT_ERROR = "Déconnexion impossible. Réessaie.";

// Logs out from the profile page. Without a session in progress the logout
// is immediate; with one, a confirmation is asked first (D-05).
export function useLogout() {
  const { logout: forgetUser } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The session in progress waiting for the user's confirmation, if any.
  const [sessionToConfirm, setSessionToConfirm] =
    useState<CurrentWorkoutSession | null>(null);

  async function performLogout() {
    setError(null);
    setIsLoggingOut(true);
    try {
      await logoutRequest();
      forgetUser();
      // replace: the back button must not show a private page again.
      navigate("/connexion", { replace: true });
    } catch {
      setError(LOGOUT_ERROR);
    } finally {
      setIsLoggingOut(false);
    }
  }

  // The button handler: looks for a session in progress first.
  async function requestLogout() {
    setError(null);
    let current: CurrentWorkoutSession | null = null;
    try {
      current = await readCurrentWorkoutSession();
    } catch {
      // Cannot know: never block the way out, log out anyway.
      current = null;
    }

    if (current !== null) {
      setSessionToConfirm(current);
      return;
    }
    await performLogout();
  }

  async function confirmLogout() {
    setSessionToConfirm(null);
    await performLogout();
  }

  function stayConnected() {
    setSessionToConfirm(null);
  }

  return {
    isLoggingOut,
    error,
    sessionToConfirm,
    requestLogout,
    confirmLogout,
    stayConnected,
    retry: performLogout,
  };
}
