import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./api";
import { ApiError } from "./apiError";

// A fake answer with only what apiFetch reads.
function fakeResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () =>
      body === undefined
        ? Promise.reject(new Error("no body"))
        : Promise.resolve(body),
  };
}

describe("apiFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the JSON of a successful answer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(fakeResponse(200, { id: 1 })),
    );

    await expect(apiFetch("/health")).resolves.toEqual({ id: 1 });
  });

  it("sends the cookie and the JSON header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, {}));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/health", { method: "POST", body: "{}" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("returns undefined for 204 No Content", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fakeResponse(204)));

    await expect(apiFetch("/logout")).resolves.toBeUndefined();
  });

  it("reads the code, message, field and fields of a server error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        fakeResponse(400, {
          error: {
            code: "VALIDATION_ERROR",
            message: "Certaines données sont invalides.",
            fields: [{ field: "email", message: "Adresse e-mail invalide." }],
          },
        }),
      ),
    );

    const error = await apiFetch("/users").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Certaines données sont invalides.",
      fields: [{ field: "email", message: "Adresse e-mail invalide." }],
    });
  });

  it("still gives an ApiError when the error body is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fakeResponse(502)));

    const error = await apiFetch("/health").catch((e: unknown) => e);

    expect(error).toMatchObject({
      status: 502,
      code: "UNKNOWN_ERROR",
      message: "Une erreur est survenue. Réessaie plus tard.",
    });
  });

  it("turns a network failure into a readable ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );

    const error = await apiFetch("/health").catch((e: unknown) => e);

    expect(error).toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Connexion impossible. Réessaie.",
    });
  });

  it("lets a cancelled call through untouched", async () => {
    const abort = new Error("The operation was aborted");
    abort.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abort));

    await expect(apiFetch("/health")).rejects.toBe(abort);
  });
});
