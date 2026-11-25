import { useEffect, useState } from "react";

// A countdown that trusts the clock, not its own ticks: the time left is
// recomputed from the end time, so it stays right when the app goes to the
// background or the tab sleeps (US-30).
export function useCountdown(initialSeconds: number) {
  const [endsAt, setEndsAt] = useState(
    () => Date.now() + initialSeconds * 1000,
  );
  const [now, setNow] = useState(() => Date.now());

  const secondsLeft = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const isOver = secondsLeft === 0;

  useEffect(() => {
    if (isOver) {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [isOver]);

  // "− 15 s" / "+ 15 s": the end moves, never before now.
  function addSeconds(delta: number) {
    const current = Date.now();
    setNow(current);
    setEndsAt((end) => Math.max(current, end + delta * 1000));
  }

  // "Passer le repos": over right away.
  function skip() {
    const current = Date.now();
    setNow(current);
    setEndsAt(current);
  }

  return { secondsLeft, isOver, addSeconds, skip };
}
