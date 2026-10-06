export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function addDays(date, days) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return localDate(value);
}
export function daysBetween(from, to) {
  return Math.round(
    (new Date(`${to}T12:00:00`) - new Date(`${from}T12:00:00`)) / 86400000,
  );
}
export function buildPlan({
  title,
  members,
  tasks,
  deadline,
  today = localDate(),
  claim = false,
}) {
  if (!title.trim()) throw new Error("Give your project a name.");
  if (
    !members.length ||
    members.length > 8 ||
    new Set(members.map((m) => m.toLowerCase())).size !== members.length
  )
    throw new Error("Enter 1–8 unique teammate aliases, separated by commas.");
  if (!tasks.length || tasks.length > 30)
    throw new Error("Add between 1 and 30 tasks.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(deadline) ||
    localDate(new Date(`${deadline}T12:00:00`)) !== deadline ||
    deadline < today
  )
    throw new Error("Choose today or a future deadline.");
  for (const task of tasks)
    if (
      !task.name.trim() ||
      !Number.isFinite(task.hours) ||
      task.hours <= 0 ||
      task.hours > 100
    )
      throw new Error(
        "Each task needs a name and an estimate above 0 and at most 100 hours.",
      );
  const loads = members.map(() => 0);
  const owners = new Map();
  tasks
    .map((task, index) => ({ ...task, index }))
    .sort((a, b) => b.hours - a.hours)
    .forEach((task) => {
      const member = loads.indexOf(Math.min(...loads));
      loads[member] += task.hours;
      owners.set(task.index, members[member]);
    });
  const days = daysBetween(today, deadline);
  const workDays = Math.max(0, days - 1);
  return {
    title: title.trim(),
    deadline,
    members,
    today,
    tasks: tasks.map((task, index) => ({
      ...task,
      owner: claim ? null : owners.get(index),
      due: addDays(today, Math.floor((workDays * (index + 1)) / tasks.length)),
      done: false,
    })),
  };
}
export function workloads(plan) {
  const totals = Object.fromEntries(plan.members.map((m) => [m, 0]));
  let open = 0;
  for (const task of plan.tasks)
    if (task.owner === null) open += task.hours;
    else totals[task.owner] += task.hours;
  return { totals, open };
}
export function fairness(plan) {
  const { totals, open } = workloads(plan);
  const values = Object.values(totals);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const spread = Number((max - min).toFixed(2));
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const even = values.length < 2 || spread <= Math.max(1, average * 0.2);
  return { spread, even, open };
}
export function balanceOpen(plan) {
  const { totals } = workloads(plan);
  const open = plan.tasks
    .filter((task) => task.owner === null)
    .sort((a, b) => b.hours - a.hours);
  for (const task of open) {
    const member = plan.members.reduce((best, m) =>
      totals[m] < totals[best] ? m : best,
    );
    task.owner = member;
    totals[member] += task.hours;
  }
  return open.length;
}
export function isLate(task, today = localDate()) {
  return !task.done && task.due < today;
}
export function checkIns(plan) {
  const days = daysBetween(plan.today, plan.deadline);
  const dates = new Set();
  if (days >= 4) dates.add(addDays(plan.today, Math.floor(days / 2)));
  if (days >= 2) dates.add(addDays(plan.deadline, -1));
  return [...dates].sort();
}
const ownerName = (task) => task.owner ?? "Open, anyone can claim";
export function planText(plan) {
  const progress = plan.tasks.filter((t) => t.done).length;
  const meetings = checkIns(plan);
  return `${plan.title}\nFinal deadline: ${plan.deadline} · ${progress}/${plan.tasks.length} done\n\n${plan.tasks.map((task, i) => `${i + 1}. ${task.done ? "[x]" : "[ ]"} ${task.name}\n   Owner: ${ownerName(task)} | Estimate: ${task.hours}h | Due: ${task.due}`).join("\n\n")}\n${meetings.length ? `\nCheck-ins: ${meetings.join(", ")}\n` : ""}\nDiscuss this draft with your team. Assignments balance estimated hours, not skills or availability. Dates follow task order; dependencies and feasibility need your review.\n`;
}
export function checkInText(plan, today = localDate()) {
  const done = plan.tasks.filter((t) => t.done).length;
  const late = plan.tasks.filter((t) => isLate(t, today));
  const soon = plan.tasks.filter(
    (t) => !t.done && !isLate(t, today) && daysBetween(today, t.due) <= 2,
  );
  const open = plan.tasks.filter((t) => t.owner === null && !t.done);
  const left = daysBetween(today, plan.deadline);
  const lines = [
    `${plan.title}: check-in (${today})`,
    `${done} of ${plan.tasks.length} tasks done · ${left > 0 ? `${left} day${left === 1 ? "" : "s"} to the deadline` : left === 0 ? "due today" : "past the deadline"}`,
  ];
  const list = (heading, tasks) => {
    if (tasks.length)
      lines.push(
        "",
        heading,
        ...tasks.map(
          (t) => `- ${t.name} (${t.owner ? `${t.owner}, ` : ""}due ${t.due})`,
        ),
      );
  };
  list("Behind schedule:", late);
  list("Due in the next 2 days:", soon);
  list("Still needs an owner:", open);
  if (!late.length && !soon.length && !open.length)
    lines.push("", "Nothing is behind. Keep going!");
  lines.push("", "Reply with anything you're stuck on.");
  return `${lines.join("\n")}\n`;
}
const toBase64Url = (text) => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};
const fromBase64Url = (text) => {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(
    Uint8Array.from(binary, (c) => c.charCodeAt(0)),
  );
};
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const cleanText = (value, max) =>
  typeof value === "string" && value.trim() && value.length <= max
    ? value
    : null;
export function encodePlan(plan) {
  return toBase64Url(
    JSON.stringify({
      v: 1,
      n: plan.title,
      d: plan.deadline,
      s: plan.today,
      m: plan.members,
      t: plan.tasks.map((t) => [
        t.name,
        t.hours,
        t.owner,
        t.due,
        t.done ? 1 : 0,
      ]),
    }),
  );
}
export function encodeTemplate({ title, deadline, tasks }) {
  return toBase64Url(
    JSON.stringify({
      v: 1,
      n: title,
      d: deadline,
      t: tasks.map((t) => [t.name, t.hours]),
    }),
  );
}
function decodeTasks(raw, full) {
  if (!Array.isArray(raw) || !raw.length || raw.length > 30) throw new Error();
  return raw.map((row) => {
    if (!Array.isArray(row)) throw new Error();
    const name = cleanText(row[0], 180);
    const hours = row[1];
    if (!name || typeof hours !== "number" || !(hours > 0 && hours <= 100))
      throw new Error();
    return full ? { name, hours } : { name, hours, row };
  });
}
export function decodeTemplate(text) {
  try {
    const data = JSON.parse(fromBase64Url(text));
    const title = cleanText(data.n, 100);
    if (data.v !== 1 || !title || (data.d && !DATE.test(data.d)))
      throw new Error();
    return { title, deadline: data.d || "", tasks: decodeTasks(data.t, true) };
  } catch {
    throw new Error("This template link is damaged. Ask for a new one.");
  }
}
export function decodePlan(text) {
  try {
    const data = JSON.parse(fromBase64Url(text));
    const title = cleanText(data.n, 100);
    const members = data.m;
    if (
      data.v !== 1 ||
      !title ||
      !DATE.test(data.d) ||
      !DATE.test(data.s) ||
      data.s > data.d ||
      !Array.isArray(members) ||
      !members.length ||
      members.length > 8 ||
      members.some((m) => !cleanText(m, 40)) ||
      new Set(members.map((m) => m.toLowerCase())).size !== members.length
    )
      throw new Error();
    const tasks = decodeTasks(data.t, false).map(({ name, hours, row }) => {
      const [, , owner, due, done] = row;
      if (
        (owner !== null && !members.includes(owner)) ||
        !DATE.test(due) ||
        due < data.s ||
        due > data.d
      )
        throw new Error();
      return { name, hours, owner, due, done: done === 1 };
    });
    return { title, deadline: data.d, today: data.s, members, tasks };
  } catch {
    throw new Error(
      "This plan link is damaged or incomplete. Ask your teammate to copy it again.",
    );
  }
}
const RULES = [
  [
    /present|slide|pitch|deck|speech/i,
    /slide|deck/i,
    "Build the slide deck",
    3,
    "presentation",
  ],
  [
    /present|pitch|speech|oral/i,
    /rehears|practice/i,
    "Rehearse together and time it",
    1,
    "presentation",
  ],
  [
    /paper|essay|report|memo|write|written/i,
    /outline/i,
    "Outline the paper and split sections",
    1,
    "written work",
  ],
  [
    /paper|essay|report|memo|write|written/i,
    /edit|proofread|polish/i,
    "Edit for one consistent voice",
    1.5,
    "written work",
  ],
  [
    /\b(cit|source|reference|bibliograph|apa\b|mla\b|literature)/i,
    /cit|reference|bibliograph|source/i,
    "Check citations and references",
    1,
    "sources",
  ],
  [
    /research|literature|evidence|data/i,
    /research/i,
    "Research and share notes",
    2,
    "research",
  ],
  [
    /survey|interview|participant|customer/i,
    /survey|interview/i,
    "Collect interviews or survey responses",
    2,
    "primary research",
  ],
  [
    /\b(excel|spreadsheet|model|financial|budget|valuation|forecast)/i,
    /model|spreadsheet|budget|forecast/i,
    "Build and check the numbers",
    2,
    "numbers",
  ],
  [
    /rubric|grading|criteria/i,
    /rubric/i,
    "Check the work against the rubric",
    0.5,
    "rubric",
  ],
  [
    /peer eval|peer review|catme|self.?assessment/i,
    /peer/i,
    "Complete peer evaluations",
    0.5,
    "peer evaluation",
  ],
  [
    /\b(video|record)/i,
    /video|record/i,
    "Record and edit the video",
    2,
    "video",
  ],
  [/poster/i, /poster/i, "Design the poster", 2, "poster"],
  [
    /\b(code|coding|program|app|prototype|build)\b/i,
    /code|build|test/i,
    "Build and test the prototype",
    3,
    "build",
  ],
  [
    /submit|upload|canvas|carmen|turn in|due/i,
    /submit|upload|turn in/i,
    "Final check and submit",
    0.5,
    "submission",
  ],
];
export function suggestTasks(brief, existing = []) {
  if (!brief.trim()) return [];
  const names = existing.map((t) => t.name).join(" \n ");
  const seen = new Set();
  const out = [];
  for (const [inBrief, covered, name, hours, reason] of RULES) {
    if (!inBrief.test(brief) || covered.test(names) || seen.has(name)) continue;
    seen.add(name);
    out.push({ name, hours, reason });
  }
  return out.slice(0, 8);
}
export const TEMPLATES = {
  Presentation: [
    ["Research the topic and share notes", 2],
    ["Outline the story and slide order", 1],
    ["Build the slide deck", 3],
    ["Write speaker notes", 1],
    ["Rehearse together and time it", 1],
  ],
  "Research paper": [
    ["Find and summarize sources", 3],
    ["Outline the paper and split sections", 1],
    ["Draft the sections", 4],
    ["Edit for one consistent voice", 1.5],
    ["Check citations and references", 1],
  ],
  "Case study": [
    ["Read the case and list the key issues", 1],
    ["Analyze the numbers", 2],
    ["Compare options and pick a recommendation", 1.5],
    ["Write up the recommendation", 2],
    ["Final check and submit", 0.5],
  ],
  "Lab report": [
    ["Run the experiment and record data", 3],
    ["Analyze data and make figures", 2],
    ["Write methods and results", 2],
    ["Write introduction and discussion", 2],
    ["Edit for one consistent voice", 1],
  ],
};
const icsText = (value) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
const fold = (line) => {
  const parts = [];
  let rest = line;
  while (rest.length > 73) {
    parts.push(rest.slice(0, 73));
    rest = ` ${rest.slice(73)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
};
export function icsFor(plan, member = null, stamp = new Date()) {
  const day = (date) => date.replace(/-/g, "");
  const now = stamp.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const events = [];
  const add = (date, summary, description, id) =>
    events.push(
      "BEGIN:VEVENT",
      `UID:${id}-${day(date)}-${encodePlan(plan).slice(-12)}@fairshare`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${day(date)}`,
      `DTEND;VALUE=DATE:${day(addDays(date, 1))}`,
      fold(`SUMMARY:${icsText(summary)}`),
      fold(`DESCRIPTION:${icsText(description)}`),
      "BEGIN:VALARM",
      "TRIGGER:-PT15H",
      "ACTION:DISPLAY",
      fold(`DESCRIPTION:${icsText(summary)}`),
      "END:VALARM",
      "END:VEVENT",
    );
  plan.tasks.forEach((task, i) => {
    if (task.done || (member && task.owner !== member)) return;
    add(
      task.due,
      `${task.name} (${ownerName(task)})`,
      `${plan.title} · ${task.hours}h estimated · final deadline ${plan.deadline}`,
      `task${i}`,
    );
  });
  checkIns(plan).forEach((date, i) =>
    add(
      date,
      `${plan.title}: team check-in`,
      "Post progress in the group chat. Fairshare can draft the check-in message.",
      `checkin${i}`,
    ),
  );
  add(
    plan.deadline,
    `${plan.title}: final deadline`,
    "Final check and submit.",
    "deadline",
  );
  return `${["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Fairshare//Group plan//EN", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR"].join("\r\n")}\r\n`;
}
