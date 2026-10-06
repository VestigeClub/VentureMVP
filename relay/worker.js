// Fairshare team assistant relay (Cloudflare Worker).
// Holds the Anthropic API key, answers questions about one live plan, and
// writes both the question and the answer to that plan's append-only log.
// Settings (Worker > Settings > Variables and Secrets):
//   ANTHROPIC_API_KEY  secret  Anthropic API key
//   FIREBASE_SECRET    secret  Realtime Database secret (lets the relay write AI entries)
//   DB_URL             text    https://<project>-default-rtdb.firebaseio.com
//   ALLOWED_ORIGIN     text    https://vestigeclub.github.io (optional, this is the default)
//   DAILY_LIMIT        text    questions per day across all plans (optional, default 100)

const MODEL = "claude-opus-5-5";
const SYSTEM = `You are the team assistant inside Fairshare, a planner for student group projects.
You see the team's current plan and the recent team log. Help the team split work fairly,
spot who is behind or overloaded, and plan next steps. Be brief and concrete: a few short
sentences or a short list, using teammates' names and task names from the plan. Today's date
is given with the plan. You cannot change the plan yourself; tell the team which change to make.
Do not write the assignment for them; help them organize the work.`;

const json = (body, status, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    },
  });

function planSummary(encoded) {
  const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const p = JSON.parse(new TextDecoder().decode(bytes));
  const lines = [
    `Project: ${p.n}`,
    `Final deadline: ${p.d}`,
    `Team: ${p.m.join(", ")}`,
    "Tasks (name | est. hours | owner | due | status):",
    ...p.t.map(
      ([name, hours, owner, due, done]) =>
        `- ${name} | ${hours}h | ${owner ?? "open, unclaimed"} | ${due} | ${done ? "done" : "not done"}`,
    ),
  ];
  return lines.join("\n");
}

async function db(env, path, init) {
  const base = env.DB_URL.replace(/\/+$/, "");
  const auth = encodeURIComponent(env.FIREBASE_SECRET);
  const response = await fetch(`${base}/${path}.json?auth=${auth}`, init);
  if (!response.ok) throw new Error(`Database error ${response.status}`);
  return response.json();
}
const append = (env, id, entry) =>
  db(env, `logs/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...entry, t: { ".sv": "timestamp" } }),
  });

async function askClaude(env, plan, history, name, question) {
  const base = env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
  const response = await fetch(`${base}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "server-side-fallback-2026-07-01",
    },
    body: JSON.stringify({
      model: MODEL,
      fallbacks: "default",
      max_tokens: 4000,
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Today is ${new Date().toISOString().slice(0, 10)}.\n\nCurrent plan:\n${plan}\n\nRecent team log:\n${history || "(empty)"}\n\n${name} asks: ${question}`,
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`AI error ${response.status}`);
  const message = await response.json();
  if (message.stop_reason === "refusal")
    return "I can’t help with that one. Try asking about the plan, deadlines, or who should take which task.";
  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
  return text.slice(0, 3500) || "I don’t have an answer for that.";
}

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGIN || "https://vestigeclub.github.io";
    const origin = request.headers.get("Origin") || "";
    if (origin !== allowed) return json({ error: "Not allowed" }, 403, allowed);
    if (request.method === "OPTIONS") return json({}, 200, origin);
    if (request.method !== "POST")
      return json({ error: "Use POST" }, 405, origin);

    let input;
    try {
      input = await request.json();
    } catch {
      return json({ error: "Bad request" }, 400, origin);
    }
    const id = String(input.id ?? "");
    const name = String(input.name ?? "").trim();
    const question = String(input.question ?? "").trim();
    if (
      !/^[A-Za-z0-9_-]{22}$/.test(id) ||
      !name ||
      name.length > 40 ||
      !question ||
      question.length > 1000
    )
      return json({ error: "Bad request" }, 400, origin);

    try {
      const record = await db(env, `plans/${id}`);
      if (typeof record?.p !== "string")
        return json({ error: "This live plan doesn’t exist." }, 404, origin);

      const day = new Date().toISOString().slice(0, 10);
      const used = (await db(env, `usage/${day}`)) ?? 0;
      if (used >= Number(env.DAILY_LIMIT || 100))
        return json(
          { error: "The assistant has hit today’s limit. Try again tomorrow." },
          429,
          origin,
        );
      await db(env, `usage/${day}`, {
        method: "PUT",
        body: JSON.stringify(used + 1),
      });

      const log = (await db(env, `logs/${id}`)) ?? {};
      const history = Object.values(log)
        .sort((a, b) => a.t - b.t)
        .slice(-12)
        .map((e) => `${e.k === "a" ? "Assistant" : e.n}: ${e.x}`)
        .join("\n");

      await append(env, id, { n: name, k: "q", x: question });
      let answer;
      try {
        answer = await askClaude(
          env,
          planSummary(record.p),
          history,
          name,
          question,
        );
      } catch {
        answer = "The assistant couldn’t answer just now. Please try again.";
      }
      await append(env, id, { n: "Assistant", k: "a", x: answer });
      return json({ ok: true }, 200, origin);
    } catch {
      return json(
        { error: "The assistant is unavailable right now." },
        502,
        origin,
      );
    }
  },
};
