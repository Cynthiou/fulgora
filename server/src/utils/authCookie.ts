import type { Response } from "express";

// The token travels in a cookie the browser sends by itself (DT-02).
// httpOnly: no script can read it. sameSite strict: never sent from another
// site. secure: HTTPS only, in production.
export const AUTH_COOKIE_NAME = "fulgora_token";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Same options to set and to clear: a browser only removes a cookie when
// name, path and flags match.
function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
  };
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: SEVEN_DAYS_MS,
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, cookieOptions());
}
