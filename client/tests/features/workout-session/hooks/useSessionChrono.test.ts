import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionChrono } from "../../../../src/features/workout-session/hooks/useSessionChrono";

describe("useSessionChrono", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-26T07:12:40.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the time since the start and moves every second", () => {
    const { result } = renderHook(() =>
      useSessionChrono("2026-11-26T07:00:00.000Z"),
    );
    expect(result.current).toBe("12:40");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe("12:41");

    // A long sleep: the text follows the clock, not the number of ticks.
    act(() => {
      vi.setSystemTime(new Date("2026-11-26T08:02:04.000Z"));
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe("1:02:05");
  });

  it("gives nothing while the start time is unknown", () => {
    const { result } = renderHook(() => useSessionChrono(null));
    expect(result.current).toBeNull();
  });
});
