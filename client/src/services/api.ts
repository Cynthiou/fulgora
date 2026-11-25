import type { ValidationField } from "shared";
import { ApiError } from "./apiError";

// One shared fetch for every call to the server.
// credentials: "include" sends the login cookie with each request.
// Pass options.signal (an AbortController) to cancel the call when a page closes.
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch (error) {
    // A cancelled call is not a failure: the caller ignores it.
    if (isAbortError(error)) {
      throw error;
    }
    throw new ApiError(0, "NETWORK_ERROR", "Connexion impossible. Réessaie.");
  }

  if (!response.ok) {
    throw await readApiError(response);
  }

  // 204 No Content: nothing to read.
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// True when the error comes from an AbortController, not from the server.
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

type ErrorBody = {
  error?: {
    code?: unknown;
    message?: unknown;
    field?: unknown;
    fields?: unknown;
  };
};

// Turns a failed answer into an ApiError, even when the body is not JSON.
async function readApiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as ErrorBody | null;
  const error = body?.error;

  const code = typeof error?.code === "string" ? error.code : "UNKNOWN_ERROR";
  const message =
    typeof error?.message === "string"
      ? error.message
      : "Une erreur est survenue. Réessaie plus tard.";
  const field = typeof error?.field === "string" ? error.field : undefined;
  const fields = Array.isArray(error?.fields)
    ? (error.fields as ValidationField[])
    : [];

  return new ApiError(response.status, code, message, field, fields);
}
