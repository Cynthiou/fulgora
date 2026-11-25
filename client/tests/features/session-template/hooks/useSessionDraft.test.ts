import { act, renderHook } from "@testing-library/react";
import { createEmptyDraft } from "shared";
import { describe, expect, it } from "vitest";
import { useSessionDraft } from "../../../../src/features/session-template/hooks/useSessionDraft";

describe("useSessionDraft", () => {
  it("starts clean, gets dirty on a change, and clean again once saved", () => {
    const { result } = renderHook(() =>
      useSessionDraft(createEmptyDraft("2026-11-26")),
    );

    expect(result.current.isDirty).toBe(false);

    act(() => result.current.dispatch({ type: "setName", name: "Jambes" }));
    expect(result.current.isDirty).toBe(true);
    expect(result.current.draft.name).toBe("Jambes");

    act(() => result.current.markSaved());
    expect(result.current.isDirty).toBe(false);
    expect(result.current.draft.name).toBe("Jambes");
  });

  it("stays clean when an action changes nothing", () => {
    const { result } = renderHook(() =>
      useSessionDraft(createEmptyDraft("2026-11-26")),
    );

    act(() => result.current.dispatch({ type: "setName", name: "" }));

    expect(result.current.isDirty).toBe(false);
  });
});
