import type { LoginPayload, PublicUser, UpdateProfileInput } from "shared";
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

// POST /api/auth/logout: the server expires the cookie (204).
export function logout(): Promise<void> {
  return apiFetch<void>("/auth/logout", { method: "POST" });
}

// PATCH /api/users/me: the pseudo and the illustrations (US-04).
export function updateProfile(input: UpdateProfileInput): Promise<PublicUser> {
  return apiFetch<PublicUser>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
