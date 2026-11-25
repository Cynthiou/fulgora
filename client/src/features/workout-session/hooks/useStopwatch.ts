import { useEffect, useRef, useState } from "react";

// A stopwatch that trusts the clock, not its own ticks (US-49): the elapsed
// time is always computed from the moment it started, so the phone can sleep
// or the tab can go to the background without losing a second.
// A pause remembers how long it lasted, and the time starts again from there.
export function useStopwatch() {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  // How many milliseconds the stopwatch spent paused since it started
  const pausedMs = useRef(0);
  const pausedAt = useRef<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const isRunning = startedAt !== null && pausedAt.current === null;
  const reference = pausedAt.current ?? now;
  const elapsedSeconds =
    startedAt === null
      ? 0
      : Math.max(
          0,
          Math.floor((reference - startedAt - pausedMs.current) / 1000),
        );

  useEffect(() => {
    if (!isRunning) {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [isRunning]);

  function start() {
    pausedMs.current = 0;
    pausedAt.current = null;
    const current = Date.now();
    setStartedAt(current);
    setNow(current);
  }

  function pause() {
    if (startedAt === null || pausedAt.current !== null) {
      return;
    }
    pausedAt.current = Date.now();
    setNow(Date.now());
  }

  function resume() {
    if (pausedAt.current === null) {
      return;
    }
    pausedMs.current += Date.now() - pausedAt.current;
    pausedAt.current = null;
    setNow(Date.now());
  }

  // Gives the time held, and stops counting.
  function stop(): number {
    const held = elapsedSeconds;
    setStartedAt(null);
    pausedAt.current = null;
    pausedMs.current = 0;
    return held;
  }

  return {
    elapsedSeconds,
    isStarted: startedAt !== null,
    isRunning,
    start,
    pause,
    resume,
    stop,
  };
}
