import type {
  ChangePasswordInput,
  DeleteAccountInput,
  LoginPayload,
  PublicUser,
  UpdatePreferencesInput,
  UpdateProfileInput,
} from "shared";
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

// PATCH /api/users/me/preferences: one preference or several (US-05).
export function updatePreferences(
  input: UpdatePreferencesInput,
): Promise<PublicUser> {
  return apiFetch<PublicUser>("/users/me/preferences", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// PUT /api/users/me/password: the password changes, the session stays
// open (US-47). Nothing comes back (204).
export function changePassword(input: ChangePasswordInput): Promise<void> {
  return apiFetch<void>("/users/me/password", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

// DELETE /api/users/me: the account and all its data (US-06). The cookie
// is cleared by the server (204).
export function deleteAccount(input: DeleteAccountInput): Promise<void> {
  return apiFetch<void>("/users/me", {
    method: "DELETE",
    body: JSON.stringify(input),
  });
}
