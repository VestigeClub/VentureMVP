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

// Team log: append-only entries under logs/<plan id>. Teammates can post notes;
// questions to the assistant and its answers are written by the relay only.
// Leave AI_URL empty to show the log without the assistant.
export const AI_URL = "";
const aiBase = () => globalThis.FAIRSHARE_AI ?? AI_URL;
export const aiEnabled = () =>
  liveEnabled() && /^(https:\/\/|http:\/\/localhost[:/])/.test(aiBase());
const logEndpoint = (id) => `${base()}/logs/${id}.json`;
export async function postNote(id, name, text) {
  const response = await fetch(logEndpoint(id), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      n: name,
      k: "note",
      x: text,
      t: { ".sv": "timestamp" },
    }),
  });
  if (!response.ok) throw new Error(`Post failed (${response.status})`);
}
export async function askAssistant(id, name, question) {
  const response = await fetch(aiBase(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, name, question }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.error || "The assistant is unavailable right now.");
}
const validEntry = (e) =>
  e &&
  typeof e.n === "string" &&
  typeof e.x === "string" &&
  typeof e.t === "number" &&
  ["q", "a", "note"].includes(e.k);
// Calls onEntries with every entry so far, oldest first, whenever one arrives.
export function watchLog(id, onEntries) {
  const entries = new Map();
  const source = new EventSource(logEndpoint(id));
  const emit = () =>
    onEntries(
      [...entries.values()].sort(
        (a, b) => a.t - b.t || (a.key < b.key ? -1 : 1),
      ),
    );
  const handle = (event) => {
    try {
      const { path, data } = JSON.parse(event.data);
      if (path === "/") {
        if (event.type === "put") entries.clear();
        for (const [key, e] of Object.entries(data ?? {}))
          if (validEntry(e)) entries.set(key, { key, ...e });
      } else {
        const key = path.slice(1).split("/")[0];
        if (validEntry(data)) entries.set(key, { key, ...data });
      }
      emit();
    } catch {
      /* ignore malformed events */
    }
  };
  source.addEventListener("put", handle);
  source.addEventListener("patch", handle);
  return () => source.close();
}
