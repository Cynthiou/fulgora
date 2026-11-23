// One shared fetch for every call to the server.
// credentials: "include" sends the login cookie with each request.
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  // 204 No Content: nothing to read.
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
