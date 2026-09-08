export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function addDays(date, days) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return localDate(value);
}
export function buildPlan({
  title,
  members,
  tasks,
  deadline,
  today = localDate(),
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
  const days = Math.round(
    (new Date(`${deadline}T12:00:00`) - new Date(`${today}T12:00:00`)) /
      86400000,
  );
  const workDays = Math.max(0, days - 1);
  return {
    title: title.trim(),
    deadline,
    members,
    today,
    tasks: tasks.map((task, index) => ({
      ...task,
      owner: owners.get(index),
      due: addDays(today, Math.floor((workDays * (index + 1)) / tasks.length)),
      done: false,
    })),
  };
}
export function planText(plan) {
  return `${plan.title}\nFinal deadline: ${plan.deadline}\n\n${plan.tasks.map((task, i) => `${i + 1}. ${task.done ? "[x]" : "[ ]"} ${task.name}\n   Owner: ${task.owner} | Estimate: ${task.hours}h | Due: ${task.due}`).join("\n\n")}\n\nDiscuss this draft with your team. Assignments balance estimated hours, not skills or availability. Dates follow task order; dependencies and feasibility need your review.\n`;
}
