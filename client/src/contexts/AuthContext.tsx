import { createContext, type ReactNode, useEffect, useState } from "react";
import type { PublicUser } from "shared";
import { readMe } from "../features/user/services/authService";
import { isAbortError } from "../services/api";

// Who is connected, shared with every page through React context.
export type AuthContextValue = {
  user: PublicUser | null;
  // True while the first GET /api/auth/me has not answered yet.
  isLoading: boolean;
  login: (user: PublicUser) => void;
  logout: () => void;
  // The profile changed: every screen follows at once (US-04)
  refresh: (user: PublicUser) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

type Props = { children: ReactNode };

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // At startup, ask the server who owns the cookie (if any).
  useEffect(() => {
    const controller = new AbortController();

    readMe(controller.signal)
      .then((me) => {
        setUser(me);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        // Cancelled (page closed): nothing to do. Any other error, including
        // 401, simply means nobody is connected.
        if (isAbortError(error)) {
          return;
        }
        setUser(null);
        setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    login: (connectedUser) => setUser(connectedUser),
    logout: () => setUser(null),
    refresh: (updated) => setUser(updated),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
