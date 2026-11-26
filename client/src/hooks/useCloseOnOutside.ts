import { type RefObject, useEffect, useRef } from "react";

// A panel that floats over the page (a "⋯" menu, a small popover) closes
// with Escape and on a tap outside of it (RM-064). Give the returned ref to
// the box that holds the button and the panel.
export function useCloseOnOutside<T extends HTMLElement>(
  isOpen: boolean,
  close: () => void,
): RefObject<T | null> {
  const boxRef = useRef<T>(null);
  // The latest callback, without restarting the listeners on every render.
  const latest = useRef(close);
  latest.current = close;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        latest.current();
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (
        boxRef.current !== null &&
        event.target instanceof Node &&
        !boxRef.current.contains(event.target)
      ) {
        latest.current();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isOpen]);

  return boxRef;
}
