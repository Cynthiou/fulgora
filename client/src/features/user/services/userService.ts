import type { PublicUser, SignupPayload } from "shared";
import { apiFetch } from "../../../services/api";

// POST /api/users: creates the account; the server opens the session (cookie).
export function createUser(payload: SignupPayload): Promise<PublicUser> {
  return apiFetch<PublicUser>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
