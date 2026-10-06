import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPlan,
  balanceOpen,
  fairness,
  workloads,
  checkIns,
  checkInText,
  encodePlan,
  decodePlan,
  encodeTemplate,
  decodeTemplate,
  suggestTasks,
  icsFor,
  planText,
} from "../planner.js";
const input = {
  title: "Case study, “final”",
  members: ["Alex", "Sam", "Jo"],
  tasks: [
    { name: "Research", hours: 2 },
    { name: "Compare", hours: 2 },
    { name: "Budget", hours: 1 },
    { name: "Slides", hours: 3 },
    { name: "Rehearse", hours: 1 },
  ],
  deadline: "2026-10-13",
  today: "2026-10-06",
};
test("claim mode leaves every task open, then balances the leftovers", () => {
  const plan = buildPlan({ ...input, claim: true });
  assert.ok(plan.tasks.every((t) => t.owner === null));
  assert.equal(workloads(plan).open, 9);
  plan.tasks[3].owner = "Jo";
  assert.equal(balanceOpen(plan), 4);
  assert.deepEqual(workloads(plan), {
    totals: { Alex: 3, Sam: 3, Jo: 3 },
    open: 0,
  });
  assert.equal(fairness(plan).even, true);
  plan.tasks.forEach((t) => (t.owner = "Alex"));
  assert.equal(fairness(plan).even, false);
});
test("team links round-trip and reject tampered data", () => {
  const plan = buildPlan(input);
  plan.tasks[0].done = true;
  plan.tasks[1].owner = null;
  assert.deepEqual(decodePlan(encodePlan(plan)), plan);
  const tamper = (patch) =>
    Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(encodePlan(plan), "base64url")),
        ...patch,
      }),
    ).toString("base64url");
  for (const patch of [
    { m: ["A", "a"] },
    { t: [["x", 0, null, "2026-10-07", 0]] },
    { t: [["x", 1, "Mallory", "2026-10-07", 0]] },
    { t: [["x", 1, null, "2026-12-01", 0]] },
    { n: "" },
    { v: 2 },
  ])
    assert.throws(() => decodePlan(tamper(patch)), /damaged/);
  assert.throws(() => decodePlan("%%%"), /damaged/);
});
test("templates carry tasks and deadline but no names", () => {
  const link = encodeTemplate(buildPlan(input));
  assert.doesNotMatch(Buffer.from(link, "base64url").toString(), /Alex|Sam/);
  assert.deepEqual(decodeTemplate(link), {
    title: input.title,
    deadline: input.deadline,
    tasks: input.tasks,
  });
});
test("check-ins land mid-project and the day before the deadline", () => {
  const plan = buildPlan(input);
  assert.deepEqual(checkIns(plan), ["2026-10-09", "2026-10-12"]);
  assert.deepEqual(checkIns({ ...plan, deadline: "2026-10-07" }), []);
  assert.match(planText(plan), /Check-ins: 2026-10-09, 2026-10-12/);
});
test("check-in message lists late, upcoming, and unclaimed work", () => {
  const plan = buildPlan(input);
  plan.tasks[0].done = true;
  plan.tasks[4].owner = null;
  const text = checkInText(plan, "2026-10-09");
  assert.match(text, /1 of 5 tasks done · 4 days to the deadline/);
  assert.match(text, /Behind schedule:\n- Compare \(Jo, due 2026-10-08\)/);
  assert.match(text, /Still needs an owner:\n- Rehearse \(due 2026-10-12\)/);
  assert.doesNotMatch(text, /- Research/);
});
test("brief checker suggests only uncovered tasks", () => {
  const found = suggestTasks(
    "10-minute presentation with slides. Cite five sources in APA. Peer evaluations in CATME. Submit on Carmen.",
    [{ name: "Build slides" }],
  ).map((s) => s.name);
  assert.ok(found.includes("Rehearse together and time it"));
  assert.ok(found.includes("Check citations and references"));
  assert.ok(found.includes("Complete peer evaluations"));
  assert.ok(!found.includes("Build the slide deck"));
  assert.ok(!found.includes("Build and check the numbers"));
  assert.deepEqual(suggestTasks("", []), []);
});
test("calendar export is valid iCalendar and filters by teammate", () => {
  const plan = buildPlan(input);
  const all = icsFor(plan, null, new Date("2026-10-06T00:00:00Z"));
  assert.match(all, /^BEGIN:VCALENDAR\r\n/);
  assert.match(all, /END:VCALENDAR\r\n$/);
  assert.equal(all.match(/BEGIN:VEVENT/g).length, 5 + 2 + 1);
  assert.match(all, /DESCRIPTION:Case study\\, “final” ·/);
  assert.ok(all.split("\r\n").every((line) => line.length <= 75));
  const jo = icsFor(plan, "Jo");
  const joTasks = plan.tasks.filter((t) => t.owner === "Jo").length;
  assert.equal(jo.match(/BEGIN:VEVENT/g).length, joTasks + 3);
});
