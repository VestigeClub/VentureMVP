import test from "node:test";
import assert from "node:assert/strict";
import relay from "../relay/worker.js";
import { buildPlan, encodePlan } from "../planner.js";

const ORIGIN = "https://vestigeclub.github.io";
const ID = "abcdefghijklmnopqrstuv";
const env = {
  ANTHROPIC_API_KEY: "test-key",
  FIREBASE_SECRET: "db-secret",
  DB_URL: "https://example-rtdb.firebaseio.com",
  DAILY_LIMIT: "2",
};
const plan = buildPlan({
  title: "Market study",
  members: ["Ana", "Ben"],
  deadline: "2026-11-01",
  today: "2026-10-20",
  tasks: [
    { name: "Survey", hours: 3 },
    { name: "Slides", hours: 2 },
  ],
});

function fakeBackend({ stop = "end_turn", used = 0 } = {}) {
  const calls = { log: [], claude: null, usage: used };
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    if (u.hostname === "api.anthropic.com") {
      calls.claude = { headers: init.headers, body: JSON.parse(init.body) };
      return Response.json({
        stop_reason: stop,
        content: [{ type: "text", text: "Ben should take Slides." }],
      });
    }
    assert.equal(u.searchParams.get("auth"), "db-secret");
    if (u.pathname === `/plans/${ID}.json`)
      return Response.json({ p: encodePlan(plan) });
    if (u.pathname.startsWith("/usage/")) {
      if (init.method === "PUT") calls.usage = JSON.parse(init.body);
      return Response.json(calls.usage);
    }
    if (u.pathname === `/logs/${ID}.json`) {
      if (init.method === "POST") {
        calls.log.push(JSON.parse(init.body));
        return Response.json({ name: `k${calls.log.length}` });
      }
      return Response.json(null);
    }
    return new Response("not found", { status: 404 });
  };
  return calls;
}
const ask = (body, origin = ORIGIN) =>
  relay.fetch(
    new Request("https://relay.example.workers.dev", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    env,
  );

test("relay rejects other sites and bad input", async () => {
  fakeBackend();
  assert.equal(
    (await ask({ id: ID, name: "Ana", question: "Hi" }, "https://evil.example"))
      .status,
    403,
  );
  assert.equal(
    (await ask({ id: "short", name: "Ana", question: "Hi" })).status,
    400,
  );
  assert.equal((await ask({ id: ID, name: "", question: "Hi" })).status, 400);
  assert.equal(
    (await ask({ id: ID, name: "Ana", question: "x".repeat(1001) })).status,
    400,
  );
});

test("relay logs the question and the answer with server timestamps", async () => {
  const calls = fakeBackend();
  const response = await ask({
    id: ID,
    name: "Ana",
    question: "Who should do slides?",
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  assert.deepEqual(
    calls.log.map((e) => [e.n, e.k, e.x, e.t[".sv"]]),
    [
      ["Ana", "q", "Who should do slides?", "timestamp"],
      ["Assistant", "a", "Ben should take Slides.", "timestamp"],
    ],
  );
  const prompt = calls.claude.body.messages[0].content;
  assert.match(prompt, /Survey \| 3h \| (Ana|Ben)/);
  assert.match(prompt, /Ana asks: Who should do slides\?/);
  assert.equal(calls.claude.body.model, "claude-opus-5-5");
  assert.equal(calls.claude.headers["x-api-key"], "test-key");
  assert.equal(calls.usage, 1);
});

test("relay handles refusals and the daily limit", async () => {
  let calls = fakeBackend({ stop: "refusal" });
  await ask({ id: ID, name: "Ana", question: "Hi" });
  assert.match(calls.log[1].x, /can’t help with that/);
  calls = fakeBackend({ used: 2 });
  const response = await ask({ id: ID, name: "Ana", question: "Hi" });
  assert.equal(response.status, 429);
  assert.equal(calls.log.length, 0);
});
