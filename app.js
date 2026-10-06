import {
  buildPlan,
  localDate,
  addDays,
  planText,
  checkInText,
  checkIns,
  workloads,
  fairness,
  balanceOpen,
  isLate,
  encodePlan,
  decodePlan,
  encodeTemplate,
  decodeTemplate,
  suggestTasks,
  icsFor,
  TEMPLATES,
} from "./planner.js";
const $ = (id) => document.getElementById(id);
const STORE = "fairshare.plans.v1";
let current = null;
let example = false;
let planIsExample = false;
let viewer = "";
let rowId = 0;
$("deadline").min = localDate();
$("deadline").value = addDays(localDate(), 7);
function addTask(name = "", hours = 1) {
  if ($("task-inputs").children.length >= 30) return;
  const row = document.createElement("div");
  row.className = "input-task";
  const id = ++rowId;
  const task = document.createElement("input");
  task.type = "text";
  task.maxLength = 180;
  task.required = true;
  task.value = name;
  task.placeholder =
    ["Research the customer", "Build the presentation", "Review and rehearse"][
      $("task-inputs").children.length
    ] || "Task name";
  task.setAttribute("aria-label", `Task ${id} name`);
  task.className = "task-input-name";
  const effort = document.createElement("input");
  effort.type = "number";
  effort.min = ".25";
  effort.max = "100";
  effort.step = ".25";
  effort.required = true;
  effort.value = hours;
  effort.className = "task-input-hours";
  effort.setAttribute("aria-label", `Task ${id} estimated hours`);
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove-task";
  remove.setAttribute("aria-label", `Remove task ${id}`);
  remove.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>';
  remove.addEventListener("click", () => {
    row.remove();
    example = false;
    updateInputControls();
    $("add-task").focus();
    markInputsChanged();
  });
  row.append(task, effort, remove);
  $("task-inputs").append(row);
  updateInputControls();
  return task;
}
function updateInputControls() {
  const rows = [...$("task-inputs").children];
  rows.forEach(
    (row) => (row.querySelector("button").disabled = rows.length === 1),
  );
  $("add-task").disabled = rows.length >= 30;
}
function markInputsChanged() {
  example = false;
  if (current)
    $("status").textContent =
      "Assignment changed. Build again to update this plan; rebuilding replaces plan edits.";
}
function inputTasks() {
  return [...$("task-inputs").children].map((row) => ({
    name: row.querySelector(".task-input-name").value.trim(),
    hours: Number(row.querySelector(".task-input-hours").value),
  }));
}
// Fills blank rows first, then appends; skips tasks already listed.
function addTasks(list) {
  const have = new Set(inputTasks().map((t) => t.name.toLowerCase()));
  const blanks = [...$("task-inputs").children].filter(
    (row) => !row.querySelector(".task-input-name").value.trim(),
  );
  let added = 0;
  for (const [name, hours] of list) {
    if (have.has(name.toLowerCase())) continue;
    const row = blanks.shift();
    if (row) {
      row.querySelector(".task-input-name").value = name;
      row.querySelector(".task-input-hours").value = hours;
    } else if (!addTask(name, hours)) break;
    have.add(name.toLowerCase());
    added++;
  }
  markInputsChanged();
  return added;
}
$("add-task").addEventListener("click", () => {
  const field = addTask();
  markInputsChanged();
  field?.focus();
});
addTask();
addTask();
addTask();
$("template-buttons").replaceChildren(
  ...Object.entries(TEMPLATES).map(([label, list]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = label;
    button.addEventListener("click", () => {
      const added = addTasks(list);
      $("error").textContent = "";
      $("brief-status").textContent = "";
      button.setAttribute("aria-pressed", "true");
      if (!$("project").value.trim()) $("project").value = `${label} project`;
      if (!added)
        $("error").textContent = "Those tasks are already in your list.";
    });
    return button;
  }),
);
$("check-brief").addEventListener("click", () => {
  const found = suggestTasks($("brief").value, inputTasks());
  $("brief-status").textContent = !$("brief").value.trim()
    ? "Paste the assignment instructions first."
    : found.length
      ? `${found.length} task${found.length === 1 ? "" : "s"} the brief mentions that your list doesn’t cover yet:`
      : "Your list already covers what we can spot in the brief. Still read it together.";
  $("suggestions").replaceChildren(
    ...found.map((item) => {
      const li = document.createElement("li");
      const text = document.createElement("span");
      text.textContent = `${item.name} · ${item.hours}h`;
      const why = document.createElement("small");
      why.textContent = `Brief mentions ${item.reason}`;
      text.append(why);
      const add = document.createElement("button");
      add.type = "button";
      add.className = "secondary small";
      add.textContent = "Add";
      add.setAttribute("aria-label", `Add ${item.name}`);
      add.addEventListener("click", () => {
        addTasks([[item.name, item.hours]]);
        li.remove();
        if (!$("suggestions").children.length)
          $("brief-status").textContent = "All suggestions added.";
      });
      li.append(text, add);
      return li;
    }),
  );
});
// ---------- saved plans (this browser only) ----------
const planId = (plan) =>
  `${plan.title}|${plan.today}|${plan.members.join(",")}`;
function readStore() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
function writeStore(list) {
  try {
    localStorage.setItem(STORE, JSON.stringify(list.slice(0, 10)));
  } catch {
    /* storage blocked: the link in the address bar still holds the plan */
  }
}
function save() {
  if (!current) return;
  const encoded = encodePlan(current);
  history.replaceState(null, "", `#plan=${encoded}`);
  if (planIsExample) return;
  const id = planId(current);
  writeStore([
    { id, title: current.title, deadline: current.deadline, plan: encoded },
    ...readStore().filter((item) => item.id !== id),
  ]);
  renderSaved();
}
function renderSaved() {
  const items = readStore();
  $("saved").hidden = !items.length;
  $("saved-list").replaceChildren(
    ...items.map((item) => {
      const li = document.createElement("li");
      const open = document.createElement("button");
      open.type = "button";
      open.className = "saved-open";
      open.textContent = item.title;
      const due = document.createElement("small");
      due.textContent = `Due ${item.deadline}`;
      open.append(due);
      open.addEventListener("click", () => {
        try {
          openPlan(decodePlan(item.plan), "Plan reopened from this browser.");
        } catch (error) {
          $("error").textContent = error.message;
        }
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-task";
      remove.setAttribute("aria-label", `Delete saved plan ${item.title}`);
      remove.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>';
      remove.addEventListener("click", () => {
        writeStore(readStore().filter((saved) => saved.id !== item.id));
        renderSaved();
      });
      li.append(open, remove);
      return li;
    }),
  );
}
// ---------- plan view ----------
function updateLoads() {
  const { totals, open } = workloads(current);
  const values = Object.values(totals);
  const max = Math.max(...values, open);
  $("balance-caption").textContent =
    `${Number((values.reduce((a, b) => a + b, 0) + open).toFixed(2))} hours total`;
  const bar = (label, hours, extra = "") => {
    const el = document.createElement("div");
    el.className = `load-item ${extra}`;
    const head = document.createElement("div");
    head.className = "load-label";
    const name = document.createElement("span");
    name.textContent = label;
    name.title = label;
    const value = document.createElement("strong");
    value.textContent = `${Number(hours.toFixed(2))}h`;
    head.append(name, value);
    const track = document.createElement("div");
    track.className = "load-track";
    track.setAttribute("aria-hidden", "true");
    const fill = document.createElement("div");
    fill.className = "load-fill";
    fill.style.width = `${max ? (hours / max) * 100 : 0}%`;
    track.append(fill);
    el.append(head, track);
    return el;
  };
  $("load-summary").replaceChildren(
    ...current.members.map((m) =>
      bar(m, totals[m], m === viewer ? "is-you" : ""),
    ),
    ...(open ? [bar("Open", open, "is-open")] : []),
  );
  const fair = fairness(current);
  $("fairness").className =
    fair.even && !fair.open ? "fair-even" : "fair-uneven";
  $("fairness").textContent = fair.open
    ? `${current.tasks.filter((t) => t.owner === null).length} open task${current.tasks.filter((t) => t.owner === null).length === 1 ? "" : "s"} still need an owner.`
    : fair.spread === 0
      ? "Perfectly even: everyone has the same estimated hours."
      : fair.even
        ? `Evenly shared: within ${fair.spread}h of each other.`
        : `Uneven: ${fair.spread}h between the most and least loaded. Consider moving a task.`;
  $("balance-open").hidden = !fair.open;
  const done = current.tasks.filter((t) => t.done).length;
  $("progress-fill").style.width = `${(done / current.tasks.length) * 100}%`;
  $("plan-summary").textContent =
    `${done}/${current.tasks.length} done · ${current.members.length} teammates · Due ${current.deadline}`;
}
function changed(message) {
  updateLoads();
  save();
  if (message) $("status").textContent = message;
}
function renderTasks() {
  const today = localDate();
  $("task-list").replaceChildren(
    ...current.tasks.map((task) => {
      const row = document.createElement("div");
      row.className = "task-row";
      row.classList.toggle("done", task.done);
      row.classList.toggle("mine", !!viewer && task.owner === viewer);
      row.classList.toggle("open", task.owner === null);
      const taskLabel = document.createElement("label");
      taskLabel.className = "task-name";
      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = task.done;
      const name = document.createElement("span");
      name.textContent = task.name;
      check.addEventListener("change", () => {
        task.done = check.checked;
        row.classList.toggle("done", task.done);
        late.hidden = !isLate(task, today);
        changed(task.done ? `Marked “${task.name}” done.` : "Marked not done.");
      });
      taskLabel.append(check, name);
      const meta = document.createElement("span");
      meta.className = "effort";
      meta.textContent = `${task.hours}h estimated`;
      const late = document.createElement("span");
      late.className = "tag late";
      late.textContent = "Behind";
      late.hidden = !isLate(task, today);
      meta.append(" ", late);
      if (task.owner === null && viewer) {
        const claim = document.createElement("button");
        claim.type = "button";
        claim.className = "claim";
        claim.textContent = "I’ll take it";
        claim.setAttribute("aria-label", `Claim ${task.name} as ${viewer}`);
        claim.addEventListener("click", () => {
          task.owner = viewer;
          renderTasks();
          changed(
            `${viewer} claimed “${task.name}”. Copy the team link to share it.`,
          );
        });
        meta.append(" ", claim);
      }
      const ownerLabel = document.createElement("label");
      ownerLabel.textContent = "Owner";
      const owner = document.createElement("select");
      owner.setAttribute("aria-label", `Owner for ${task.name}`);
      const openOption = document.createElement("option");
      openOption.value = "";
      openOption.textContent = "Open: anyone can claim";
      owner.append(openOption);
      current.members.forEach((member) => {
        const option = document.createElement("option");
        option.textContent = member;
        option.value = member;
        owner.append(option);
      });
      owner.value = task.owner ?? "";
      owner.addEventListener("change", () => {
        task.owner = owner.value || null;
        renderTasks();
        changed("Owner updated. Review the new workload before sharing.");
        $("task-list")
          .children[current.tasks.indexOf(task)]?.querySelector("select")
          ?.focus();
      });
      ownerLabel.append(owner);
      const dateLabel = document.createElement("label");
      dateLabel.textContent = "Due date";
      const due = document.createElement("input");
      due.type = "date";
      due.required = true;
      due.min = current.today;
      due.max = current.deadline;
      due.value = task.due;
      due.setAttribute("aria-label", `Due date for ${task.name}`);
      due.addEventListener("change", () => {
        if (!due.value || !due.checkValidity()) {
          due.value = task.due;
          $("status").textContent =
            "Choose a task date between the plan start and the final deadline.";
        } else {
          task.due = due.value;
          late.hidden = !isLate(task, today);
          changed("Task date updated.");
        }
      });
      dateLabel.append(due);
      row.append(taskLabel, meta, ownerLabel, dateLabel);
      return row;
    }),
  );
}
function renderViewer() {
  if (viewer && !current.members.includes(viewer)) viewer = "";
  const everyone = document.createElement("option");
  everyone.value = "";
  everyone.textContent = "Everyone (coordinator)";
  $("viewer").replaceChildren(
    everyone,
    ...current.members.map((m) => {
      const option = document.createElement("option");
      option.value = m;
      option.textContent = m;
      return option;
    }),
  );
  $("viewer").value = viewer;
  $("viewer-hint").textContent = viewer
    ? "Your tasks are highlighted. Claim open ones with “I’ll take it.”"
    : "Teammates pick their name to claim tasks and see their own list.";
  $("calendar").textContent = viewer
    ? `Add ${viewer}’s tasks to calendar`
    : "Add to calendar";
}
function render() {
  $("empty").hidden = true;
  $("plan").hidden = false;
  $("plan-title").textContent = current.title;
  $("sample-label").hidden = !planIsExample;
  const meetings = checkIns(current);
  $("checkin-dates").textContent = meetings.length
    ? `Suggested: ${meetings.join(" and ")}. They are added to the calendar file.`
    : "The deadline is close, so check in daily in your group chat.";
  $("schedule-note").textContent =
    current.deadline === current.today
      ? "Due today: every task is scheduled today. Check that this workload is realistic."
      : "Dates follow task order and leave the last day for review. Adjust them for your team’s availability.";
  renderViewer();
  renderTasks();
  updateLoads();
  save();
}
// Mirrors an opened plan in the form so the team can adjust and rebuild it.
function fillForm(plan) {
  $("project").value = plan.title;
  $("members").value = plan.members.join(", ");
  if (plan.deadline >= localDate()) $("deadline").value = plan.deadline;
  $("task-inputs").replaceChildren();
  plan.tasks.forEach((t) => addTask(t.name, t.hours));
  document.querySelector(
    `input[value="${plan.tasks.some((t) => t.owner === null) ? "claim" : "balance"}"]`,
  ).checked = true;
}
function openPlan(plan, message) {
  fillForm(plan);
  current = plan;
  planIsExample = false;
  viewer = "";
  render();
  $("status").textContent = message;
  $("plan-title").focus();
}
$("viewer").addEventListener("change", () => {
  viewer = $("viewer").value;
  renderViewer();
  renderTasks();
  updateLoads();
});
$("balance-open").addEventListener("click", () => {
  const count = balanceOpen(current);
  renderTasks();
  changed(
    `Balanced ${count} open task${count === 1 ? "" : "s"} across the team. Edit any owner you like.`,
  );
});
$("planner-form").addEventListener("submit", (event) => {
  event.preventDefault();
  $("error").textContent = "";
  try {
    const next = buildPlan({
      title: $("project").value,
      members: $("members")
        .value.split(",")
        .map((m) => m.trim())
        .filter(Boolean),
      tasks: inputTasks(),
      deadline: $("deadline").value,
      claim:
        document.querySelector('input[name="mode"]:checked').value === "claim",
    });
    if (next.members.some((m) => m.length > 40))
      throw new Error("Keep each teammate alias under 40 characters.");
    current = next;
    planIsExample = example;
    viewer = "";
    render();
    $("status").textContent = current.tasks.some((t) => t.owner === null)
      ? "Tasks are open. Copy the team link so everyone can claim theirs, or balance them now."
      : "Your draft is ready. Review it with your team, then share the team link.";
    $("plan-title").focus();
  } catch (error) {
    $("error").textContent = error.message;
  }
});
function loadSample() {
  $("sample-confirm").hidden = true;
  example = true;
  $("project").value = "Campus coffee shop case study";
  $("members").value = "Alex, Sam, Jo";
  $("deadline").value = addDays(localDate(), 7);
  $("task-inputs").replaceChildren();
  [
    ["Research customer needs", 2],
    ["Compare competitors", 2],
    ["Estimate the budget", 1],
    ["Draft presentation slides", 3],
    ["Review and rehearse", 1],
  ].forEach(([name, hours]) => addTask(name, hours));
  document.querySelector('input[value="balance"]').checked = true;
  $("planner-form").requestSubmit();
}
$("sample").addEventListener("click", () => {
  if (
    $("project").value.trim() ||
    $("members").value.trim() ||
    [...document.querySelectorAll(".task-input-name")].some((field) =>
      field.value.trim(),
    ) ||
    current
  ) {
    $("sample-confirm").hidden = false;
    $("keep-work").focus();
    return;
  }
  loadSample();
});
$("replace-sample").addEventListener("click", loadSample);
$("keep-work").addEventListener("click", () => {
  $("sample-confirm").hidden = true;
  $("sample").focus();
});
$("planner-form").addEventListener("input", (event) => {
  if (event.target.id !== "brief") markInputsChanged();
});
// ---------- sharing ----------
const label = () =>
  planIsExample ? "SAMPLE PROJECT — demonstration only\n\n" : "";
const pageUrl = () => `${location.origin}${location.pathname}`;
async function copy(text, success) {
  try {
    await navigator.clipboard.writeText(text);
    $("status").textContent = success;
  } catch {
    $("status").textContent =
      "Clipboard access is unavailable here. Use Download plan instead.";
  }
}
function download(text, name, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const fileName = (suffix) =>
  `${
    current.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "fairshare-plan"
  }${suffix}`;
$("download").addEventListener("click", () => {
  download(
    label() + planText(current),
    fileName(".txt"),
    "text/plain;charset=utf-8",
  );
  $("status").textContent =
    "Download requested. Check your downloads and share the file with your team.";
});
$("copy").addEventListener("click", () =>
  copy(
    `${label()}${planText(current)}\nOpen, claim, and update: ${pageUrl()}#plan=${encodePlan(current)}\n`,
    "Plan copied with its team link. Paste it into your group chat.",
  ),
);
$("copy-link").addEventListener("click", () =>
  copy(
    `${pageUrl()}#plan=${encodePlan(current)}`,
    "Team link copied. Teammates open it, pick their name, and claim tasks. They send the link back after changes.",
  ),
);
$("copy-checkin").addEventListener("click", () =>
  copy(
    `${checkInText(current)}\nLatest plan: ${pageUrl()}#plan=${encodePlan(current)}\n`,
    "Check-in message copied. Paste it into your group chat.",
  ),
);
$("calendar").addEventListener("click", () => {
  download(
    icsFor(current, viewer || null),
    fileName(
      viewer
        ? `-${viewer.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`
        : ".ics",
    ),
    "text/calendar;charset=utf-8",
  );
  $("status").textContent =
    "Calendar file downloaded. Open it to add due dates, check-ins, and reminders to your calendar.";
});
$("copy-template").addEventListener("click", () =>
  copy(
    `${pageUrl()}#template=${encodeTemplate(current)}`,
    "Template link copied. Anyone who opens it starts with these tasks and the deadline, then adds their own team.",
  ),
);
// ---------- opening links ----------
function openFromHash() {
  const hash = location.hash;
  try {
    if (hash.startsWith("#plan=")) {
      const plan = decodePlan(hash.slice(6));
      const saved = readStore().find((item) => item.id === planId(plan));
      openPlan(
        plan,
        saved && saved.plan !== hash.slice(6)
          ? "Opened the shared version of this plan. It replaces your saved copy here."
          : "Opened a shared plan. Pick your name under “Viewing as” to claim tasks.",
      );
      $("workspace").scrollIntoView();
    } else if (hash.startsWith("#template=")) {
      const template = decodeTemplate(hash.slice(10));
      $("project").value = template.title;
      if (template.deadline && template.deadline >= localDate())
        $("deadline").value = template.deadline;
      $("task-inputs").replaceChildren();
      template.tasks.forEach((t) => addTask(t.name, t.hours));
      history.replaceState(null, "", location.pathname);
      $("workspace").scrollIntoView();
      $("members").focus();
      $("error").textContent = "";
      $("status").textContent = "";
      $("template-note").hidden = false;
    }
  } catch (error) {
    $("error").textContent = error.message;
  }
}
renderSaved();
openFromHash();
window.addEventListener("hashchange", openFromHash);
