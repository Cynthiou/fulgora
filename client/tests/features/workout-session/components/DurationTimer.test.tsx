import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CardioStepTimer from "../../../../src/features/workout-session/components/CardioStepTimer";
import DurationTimer from "../../../../src/features/workout-session/components/DurationTimer";

// The timers read the clock, so the tests move the clock (US-49).
function tick(seconds: number) {
  act(() => {
    vi.advanceTimersByTime(seconds * 1000);
  });
}

describe("DurationTimer (B5b, B5c)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts down from the planned time and validates the set at zero", () => {
    const onDone = vi.fn();
    render(
      <DurationTimer plannedSeconds={60} isPending={false} onDone={onDone} />,
    );

    expect(screen.getByText("Minuteur · prévu 1 min")).toBeTruthy();
    expect(screen.getByText("1:00")).toBeTruthy();

    act(() => {
      screen.getByRole("button", { name: /Lancer le minuteur/ }).click();
    });
    tick(53);
    expect(screen.getByText("0:07")).toBeTruthy();
    expect(screen.getByText("Fin dans 7 s · bip à 3, 2, 1")).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();

    tick(8);
    // Validated once, with the time that was planned
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith(60);
  });

  it("freezes the time on a pause and starts again", () => {
    render(
      <DurationTimer plannedSeconds={60} isPending={false} onDone={vi.fn()} />,
    );
    act(() => {
      screen.getByRole("button", { name: /Lancer le minuteur/ }).click();
    });
    tick(10);
    expect(screen.getByText("0:50")).toBeTruthy();

    act(() => {
      screen.getByRole("button", { name: /Pause/ }).click();
    });
    tick(20);
    expect(screen.getByText("0:50")).toBeTruthy();

    act(() => {
      screen.getByRole("button", { name: /Reprendre/ }).click();
    });
    tick(5);
    expect(screen.getByText("0:45")).toBeTruthy();
  });

  it("records the time held when it is stopped before the end", () => {
    const onDone = vi.fn();
    render(
      <DurationTimer plannedSeconds={60} isPending={false} onDone={onDone} />,
    );
    act(() => {
      screen.getByRole("button", { name: /Lancer le minuteur/ }).click();
    });
    tick(22);
    act(() => {
      screen.getByRole("button", { name: /Arrêter/ }).click();
    });

    expect(onDone).toHaveBeenCalledWith(22);
  });

  it("counts up when the stopwatch is chosen", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <DurationTimer plannedSeconds={60} isPending={false} onDone={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "Chrono ↑" }));
    expect(screen.getByText("Chrono · objectif 1 min")).toBeTruthy();
    act(() => {
      screen.getByRole("button", { name: /Lancer le chrono/ }).click();
    });
    tick(75);

    expect(screen.getByText("1:15")).toBeTruthy();
  });
});

describe("CardioStepTimer (B5d, B5e)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("launches the stage, keeps counting past the objective and gives the time", () => {
    const onStop = vi.fn();
    render(
      <CardioStepTimer
        plannedSeconds={600}
        stageLabel="Étape 2"
        isPending={false}
        onStop={onStop}
      />,
    );

    act(() => {
      screen.getByRole("button", { name: /Lancer l'étape/ }).click();
    });
    tick(612);

    expect(screen.getByText("10:12")).toBeTruthy();
    expect(screen.getByText(/objectif atteint/)).toBeTruthy();

    act(() => {
      screen.getByRole("button", { name: /Arrêter/ }).click();
    });
    expect(onStop).toHaveBeenCalledWith(612);
  });
});
