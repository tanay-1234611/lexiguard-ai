/** Small fetch helper for the browser. Throws Error(message) using the API's error shape. */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error("Network error. Check your connection and that the server is running.");
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    const msg = (json as { error?: { message?: string } } | null)?.error?.message;
    throw new Error(msg ?? `Request failed (${res.status}).`);
  }
  return json as T;
}

export function sectionLabel(page: number | null, segmentId: number | null): string {
  if (page) return `Page ${page}`;
  return segmentId !== null ? `Section ${segmentId + 1}` : "Source not located";
}
