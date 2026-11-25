import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountdown } from "../../../../src/features/workout-session/hooks/useCountdown";
import {
  type Alerts,
  useTimerAlerts,
} from "../../../../src/features/workout-session/hooks/useTimerAlerts";

describe("useCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-26T07:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts from the clock, so a sleep of 30 seconds is not lost", () => {
    const { result } = renderHook(() => useCountdown(90));
    expect(result.current.secondsLeft).toBe(90);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.secondsLeft).toBe(89);

    // The tab sleeps: no tick for 30 seconds, then one tick
    act(() => {
      vi.setSystemTime(new Date("2026-11-26T07:00:31.000Z"));
      vi.advanceTimersByTime(250);
    });
    expect(result.current.secondsLeft).toBe(59);
  });

  it("adds or removes 15 seconds, never below zero, and can be skipped", () => {
    const { result } = renderHook(() => useCountdown(20));

    act(() => result.current.addSeconds(15));
    expect(result.current.secondsLeft).toBe(35);

    act(() => result.current.addSeconds(-15));
    act(() => result.current.addSeconds(-15));
    act(() => result.current.addSeconds(-15));
    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.isOver).toBe(true);

    const other = renderHook(() => useCountdown(60));
    act(() => other.result.current.skip());
    expect(other.result.current.secondsLeft).toBe(0);
    expect(other.result.current.isOver).toBe(true);
  });
});

describe("useTimerAlerts", () => {
  it("rings once at 3, 2, 1 and a long beep with a vibration at 0", () => {
    const alerts: Alerts = { beep: vi.fn(), vibrate: vi.fn() };
    const { rerender } = renderHook(
      ({ left }: { left: number }) => useTimerAlerts(left, alerts),
      { initialProps: { left: 5 } },
    );

    for (const left of [4, 3, 3, 2, 1, 1, 0, 0]) {
      rerender({ left });
    }

    expect(alerts.beep).toHaveBeenCalledTimes(4);
    expect(alerts.beep).toHaveBeenNthCalledWith(1, 120);
    expect(alerts.beep).toHaveBeenNthCalledWith(4, 600);
    expect(alerts.vibrate).toHaveBeenCalledTimes(1);
  });

  it("does not fail when the browser has neither audio nor vibration", () => {
    expect(typeof AudioContext).toBe("undefined");
    expect("vibrate" in navigator).toBe(false);
    const { rerender } = renderHook(
      ({ left }: { left: number }) => useTimerAlerts(left),
      { initialProps: { left: 1 } },
    );
    expect(() => rerender({ left: 0 })).not.toThrow();
  });
});
