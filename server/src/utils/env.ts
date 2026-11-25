// Reads a variable that must be present. Secrets and credentials only come
// from the environment (DT-08): a missing one stops the program with a clear
// message instead of a confusing failure later.
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}
