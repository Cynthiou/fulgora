// Reads MySQL errors without guessing from their text more than needed.

// When a unique key refuses an INSERT, MySQL answers ER_DUP_ENTRY with a
// message such as: Duplicate entry 'lea.m' for key 'user.uq_user_username'.
// This returns the key name ("uq_user_username"), or null for any other error.
export function readDuplicateKeyName(error: unknown): string | null {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    error.code !== "ER_DUP_ENTRY" ||
    !("message" in error) ||
    typeof error.message !== "string"
  ) {
    return null;
  }

  const match = /for key '(?:[^'.]+\.)?([^']+)'/.exec(error.message);
  return match === null ? null : (match[1] ?? null);
}
