import argon2, { type HashOptions } from "argon2";

// Argon2id is slow and memory-hungry on purpose: guessing millions of
// passwords becomes too expensive. These are the OWASP recommended minimums:
// 19 MiB of memory, 2 passes, 1 thread.
const HASH_OPTIONS: HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

// The result starts with "$argon2id$" and embeds its own random salt, so the
// same password gives a different hash every time.
export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, HASH_OPTIONS);
}

// True when the password matches the stored hash.
export function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  return argon2.verify(hash, password);
}
