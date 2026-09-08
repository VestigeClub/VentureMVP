import { buildPlan, localDate, addDays, planText } from "./planner.js";
const $ = (id) => document.getElementById(id);
let current = null;
let example = false;
let planIsExample = false;
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
$("add-task").addEventListener("click", () => {
  const field = addTask();
  markInputsChanged();
  field?.focus();
});
addTask();
addTask();
addTask();
function updateLoads() {
  const totals = current.members.map((member) =>
    current.tasks
      .filter((t) => t.owner === member)
      .reduce((sum, t) => sum + t.hours, 0),
  );
  const max = Math.max(...totals);
  $("balance-caption").textContent =
    `${Number(totals.reduce((a, b) => a + b, 0).toFixed(2))} hours total`;
  $("load-summary").replaceChildren(
    ...current.members.map((member, index) => {
      const el = document.createElement("div");
      el.className = "load-item";
      const label = document.createElement("div");
      label.className = "load-label";
      const name = document.createElement("span");
      name.textContent = member;
      name.title = member;
      const value = document.createElement("strong");
      value.textContent = `${Number(totals[index].toFixed(2))}h`;
      label.append(name, value);
      const track = document.createElement("div");
      track.className = "load-track";
      track.setAttribute("aria-hidden", "true");
      const fill = document.createElement("div");
      fill.className = "load-fill";
      fill.style.width = `${max ? (totals[index] / max) * 100 : 0}%`;
      track.append(fill);
      el.append(label, track);
      return el;
    }),
  );
}
function render() {
  $("empty").hidden = true;
  $("plan").hidden = false;
  $("plan-title").textContent = current.title;
  $("sample-label").hidden = !planIsExample;
  $("plan-summary").textContent =
    `${current.tasks.length} tasks · ${current.members.length} teammates · Due ${current.deadline}`;
  $("schedule-note").textContent =
    current.deadline === current.today
      ? "Due today: every task is scheduled today. Check that this workload is realistic."
      : "Dates follow task order and leave the last day for review. Adjust them for your team’s availability.";
  updateLoads();
  $("task-list").replaceChildren(
    ...current.tasks.map((task) => {
      const row = document.createElement("div");
      row.className = "task-row";
      const taskLabel = document.createElement("label");
      taskLabel.className = "task-name";
      const check = document.createElement("input");
      check.type = "checkbox";
      const name = document.createElement("span");
      name.textContent = task.name;
      check.addEventListener("change", () => {
        task.done = check.checked;
        row.classList.toggle("done", task.done);
      });
      taskLabel.append(check, name);
      const effort = document.createElement("span");
      effort.className = "effort";
      effort.textContent = `${task.hours}h estimated`;
      const ownerLabel = document.createElement("label");
      ownerLabel.textContent = "Owner";
      const owner = document.createElement("select");
      owner.setAttribute("aria-label", `Owner for ${task.name}`);
      current.members.forEach((member) => {
        const option = document.createElement("option");
        option.textContent = member;
        option.value = member;
        owner.append(option);
      });
      owner.value = task.owner;
      owner.addEventListener("change", () => {
        task.owner = owner.value;
        updateLoads();
        $("status").textContent =
          "Owner updated. Review the new workload before sharing.";
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
            "Choose a task date between today and the final deadline.";
        } else {
          task.due = due.value;
          $("status").textContent = "Task date updated.";
        }
      });
      dateLabel.append(due);
      row.append(taskLabel, effort, ownerLabel, dateLabel);
      return row;
    }),
  );
  $("status").textContent =
    "Your draft is ready. Review it with your team, then download or copy.";
  $("plan-title").focus();
}
$("planner-form").addEventListener("submit", (event) => {
  event.preventDefault();
  $("error").textContent = "";
  try {
    const tasks = [...$("task-inputs").children].map((row) => ({
      name: row.querySelector(".task-input-name").value.trim(),
      hours: Number(row.querySelector(".task-input-hours").value),
    }));
    const next = buildPlan({
      title: $("project").value,
      members: $("members")
        .value.split(",")
        .map((m) => m.trim())
        .filter(Boolean),
      tasks,
      deadline: $("deadline").value,
    });
    current = next;
    planIsExample = example;
    render();
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
$("planner-form").addEventListener("input", markInputsChanged);
$("download").addEventListener("click", () => {
  const text =
    (planIsExample ? "SAMPLE PROJECT — demonstration only\n\n" : "") +
    planText(current);
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "fairshare-project-plan.txt";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $("status").textContent =
    "Download requested. Check your downloads and share the file with your team.";
});
$("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(
      (planIsExample ? "SAMPLE PROJECT — demonstration only\n\n" : "") +
        planText(current),
    );
    $("status").textContent = "Plan copied. Paste it into your group chat.";
  } catch {
    $("status").textContent =
      "Clipboard access is unavailable. Use Download plan instead.";
  }
});
