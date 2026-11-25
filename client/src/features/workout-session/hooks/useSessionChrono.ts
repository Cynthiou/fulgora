import { useEffect, useState } from "react";
import { formatElapsed } from "shared";

// "12:40" since the real start of the session. The text is computed from the
// recorded start time every second, never from a counter: it stays right
// after a reload, a sleep or a change of tab (US-28).
export function useSessionChrono(startedAt: string | null): string | null {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (startedAt === null) {
      return;
    }
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  return startedAt === null ? null : formatElapsed(startedAt, now);
}
