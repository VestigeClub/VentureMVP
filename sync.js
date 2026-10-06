// Live plans use the Firebase Realtime Database REST API: PUT to save,
// server-sent events to receive teammates' edits. No SDK or accounts.
// Leave DB_URL empty to run in link-only mode.
export const DB_URL = "";
const base = () => (globalThis.FAIRSHARE_DB ?? DB_URL).replace(/\/+$/, "");
export const liveEnabled = () =>
  /^(https:\/\/|http:\/\/localhost[:/])/.test(base());
export const validLiveId = (id) => /^[A-Za-z0-9_-]{22}$/.test(id);
export function newLiveId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
const endpoint = (id) => `${base()}/plans/${id}.json`;
export async function pushPlan(id, encoded) {
  const response = await fetch(endpoint(id), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p: encoded, t: { ".sv": "timestamp" } }),
  });
  if (!response.ok) throw new Error(`Sync failed (${response.status})`);
}
export async function fetchPlan(id) {
  const response = await fetch(endpoint(id));
  if (!response.ok) throw new Error(`Load failed (${response.status})`);
  const data = await response.json();
  return typeof data?.p === "string" ? data.p : null;
}
export function watchPlan(id, onPlan, onStatus) {
  const source = new EventSource(endpoint(id));
  const handle = (event) => {
    try {
      const { path, data } = JSON.parse(event.data);
      if (path === "/" && typeof data?.p === "string") onPlan(data.p);
      else if (path === "/p" && typeof data === "string") onPlan(data);
    } catch {
      /* ignore malformed events; the next one carries the whole plan */
    }
  };
  source.addEventListener("put", handle);
  source.addEventListener("patch", handle);
  source.addEventListener("open", () => onStatus("live"));
  source.addEventListener("error", () => onStatus("reconnecting"));
  source.addEventListener("cancel", () => onStatus("off"));
  return () => source.close();
}
