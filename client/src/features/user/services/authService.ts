import type { LoginPayload, PublicUser } from "shared";
import { apiFetch } from "../../../services/api";

// POST /api/auth/login: opens the session (cookie) and returns the user.
export function login(payload: LoginPayload): Promise<PublicUser> {
  return apiFetch<PublicUser>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// GET /api/auth/me: who owns the cookie. 401 when nobody is connected.
export function readMe(signal?: AbortSignal): Promise<PublicUser> {
  return apiFetch<PublicUser>("/auth/me", { signal });
}
