import { useEffect, useState } from "react";

// The value, but only once it has stopped changing for `delayMs`. Typing
// "squat" letter by letter gives one search, 300 ms after the last letter.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
