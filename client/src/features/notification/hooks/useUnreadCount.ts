import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { isAbortError } from "../../../services/api";
import { readUnreadCount } from "../services/notificationService";

// How many notifications are unread, for the bell of the header (NOT-01).
// Asked again at every change of page: answering a session or reading the
// list changes the number (RM-055).
export function useUnreadCount() {
  const location = useLocation();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    readUnreadCount(controller.signal)
      .then((answer) => setCount(answer.unread_count))
      .catch((caught: unknown) => {
        if (!isAbortError(caught)) {
          // The bell simply shows nothing: it is never the main action.
          setCount(0);
        }
      });
    return () => controller.abort();
  }, [location.pathname]);

  return count;
}
