import { zoneUrl } from "./zone-url";
// Shared JSON reader. React state updates belong in the caller's response callbacks.
export async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(zoneUrl(url), { cache: "no-store", credentials: "same-origin", ...options });
  const data = await response.json();
  if (!response.ok || data?.ok === false) throw new Error(data?.error || "No se pudo completar la solicitud.");
  return data as T;
}
