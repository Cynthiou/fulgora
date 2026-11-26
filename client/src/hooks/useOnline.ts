import { useEffect, useState } from "react";

// True while the browser says it has a network. It is only a hint: the
// phone may be connected to a Wi-Fi that leads nowhere. It is enough to
// replace the error page of the browser with our own screen (US-45).
export function useOnline(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    function update() {
      setIsOnline(navigator.onLine);
    }
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return isOnline;
}
