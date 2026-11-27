import { useEffect, useRef } from "react";

// How a − or a + repeats while it is held (handoff des séries): one step
// at once, then one more every 70 ms, after waiting 380 ms.
const FIRST_WAIT_MS = 380;
const REPEAT_MS = 70;

// Gives the handlers of a button that steps once on a tap and keeps
// stepping while the finger stays on it. Lifting the finger, leaving the
// button and leaving the screen all stop it.
export function useHoldRepeat(onStep: () => void) {
  // The latest callback, without restarting anything on every render.
  const step = useRef(onStep);
  step.current = onStep;
  const waiting = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeating = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useRef(() => {
    if (waiting.current !== null) {
      clearTimeout(waiting.current);
      waiting.current = null;
    }
    if (repeating.current !== null) {
      clearInterval(repeating.current);
      repeating.current = null;
    }
  });

  // A screen left while the finger is down must not keep counting.
  useEffect(() => {
    const cancel = stop.current;
    return () => cancel();
  }, []);

  function start() {
    stop.current();
    step.current();
    waiting.current = setTimeout(() => {
      repeating.current = setInterval(() => step.current(), REPEAT_MS);
    }, FIRST_WAIT_MS);
  }

  return {
    onPointerDown: start,
    onPointerUp: () => stop.current(),
    onPointerLeave: () => stop.current(),
    onPointerCancel: () => stop.current(),
  };
}
