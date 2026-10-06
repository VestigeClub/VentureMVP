import {
  addDays,
  checkIns,
  daysBetween,
  isLate,
  workloads,
} from "./planner.js";

export const OWNER_COLORS = [
  "#2546ee",
  "#e0592a",
  "#1f9d63",
  "#a03bc4",
  "#c79100",
  "#0f8fa8",
  "#d23f6e",
  "#5b6b2e",
];
const INK = "#17191f";
const MUTED = "#60636e";
const LINE = "#dddfe6";
const FONT = '"Space Grotesk", system-ui, sans-serif';
const W = 1200;
const PAD = 56;
const DAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

export const pretty = (date) => {
  const d = new Date(`${date}T12:00:00`);
  return `${DAY[(d.getDay() + 6) % 7]} ${MONTH[d.getMonth()]} ${d.getDate()}`;
};
export const mondayOf = (date) =>
  addDays(date, -((new Date(`${date}T12:00:00`).getDay() + 6) % 7));
const tint = (hex, alpha) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
};

function fit(ctx, text, width) {
  if (ctx.measureText(text).width <= width) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(`${text.slice(0, mid)}…`).width <= width) lo = mid;
    else hi = mid - 1;
  }
  return `${text.slice(0, lo)}…`;
}
function wrap(ctx, text, width, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = fit(ctx, `${lines[maxLines - 1]} …`, width);
  }
  return lines.map((l) => fit(ctx, l, width));
}
function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

// Lays out the calendar weeks and the tallest day so the canvas height is known before drawing.
export function posterLayout(plan) {
  const start = mondayOf(plan.today);
  const weeks = Math.ceil((daysBetween(start, plan.deadline) + 1) / 7);
  const perDay = {};
  plan.tasks.forEach((t) => (perDay[t.due] = (perDay[t.due] || 0) + 1));
  const maxChips = Math.max(1, ...Object.values(perDay));
  const cellH = 44 + Math.min(maxChips, 4) * 26 + (maxChips > 4 ? 18 : 0);
  return { start, weeks, cellH };
}

export function drawPoster(
  ctx,
  plan,
  { sample = false, url = "", today, measure = false } = {},
) {
  const { start, weeks, cellH } = posterLayout(plan);
  const colors = Object.fromEntries(
    plan.members.map((m, i) => [m, OWNER_COLORS[i % OWNER_COLORS.length]]),
  );
  const colorOf = (owner) => (owner === null ? "#8a90a6" : colors[owner]);
  const meetings = new Set(checkIns(plan));
  const { totals, open } = workloads(plan);
  const done = plan.tasks.filter((t) => t.done).length;
  ctx.font = `600 44px ${FONT}`;
  const titleLines = wrap(ctx, plan.title, W - PAD * 2, 2);
  const headerH = titleLines.length > 1 ? 258 : 210;
  const loadRows = plan.members.length + (open ? 1 : 0);
  const loadH = 56 + loadRows * 34;
  const calH = 70 + weeks * cellH;
  const listH = 56 + plan.tasks.length * 40;
  const height = headerH + 36 + loadH + 30 + calH + 30 + listH + 80;
  if (measure) return height;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, height);

  // Header
  ctx.fillStyle = "#2546ee";
  ctx.fillRect(0, 0, W, headerH);
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 22px ${FONT}`;
  ctx.fillText("fairshare", PAD, 58);
  if (sample) {
    ctx.font = `600 15px ${FONT}`;
    const tag = "SAMPLE PROJECT";
    const tw = ctx.measureText(tag).width + 24;
    roundRect(ctx, W - PAD - tw, 36, tw, 30, 15, "rgba(255,255,255,.2)");
    ctx.fillStyle = "#ffffff";
    ctx.fillText(tag, W - PAD - tw + 12, 56);
  }
  ctx.font = `600 44px ${FONT}`;
  titleLines.forEach((line, i) => ctx.fillText(line, PAD, 112 + i * 48));
  ctx.font = `400 20px ${FONT}`;
  ctx.fillStyle = "#d6ddff";
  const left = daysBetween(today, plan.deadline);
  ctx.fillText(
    `Due ${pretty(plan.deadline)} · ${left > 0 ? `${left} day${left === 1 ? "" : "s"} left` : left === 0 ? "due today" : "past due"} · ${done}/${plan.tasks.length} tasks done`,
    PAD,
    headerH - 60,
  );
  {
    roundRect(
      ctx,
      PAD,
      headerH - 40,
      W - PAD * 2,
      10,
      5,
      "rgba(255,255,255,.25)",
    );
    if (done)
      roundRect(
        ctx,
        PAD,
        headerH - 40,
        Math.max(10, ((W - PAD * 2) * done) / plan.tasks.length),
        10,
        5,
        "#ffffff",
      );
  }

  // Workload
  let y = headerH + 36;
  ctx.fillStyle = INK;
  ctx.font = `600 22px ${FONT}`;
  ctx.fillText("Who’s doing what", PAD, y + 22);
  ctx.font = `400 15px ${FONT}`;
  ctx.fillStyle = MUTED;
  const total = Object.values(totals).reduce((a, b) => a + b, 0) + open;
  const totalLabel = `${Number(total.toFixed(2))} estimated hours`;
  ctx.fillText(totalLabel, W - PAD - ctx.measureText(totalLabel).width, y + 22);
  y += 48;
  const max = Math.max(...Object.values(totals), open, 1);
  const rows = [
    ...plan.members.map((m) => [m, totals[m], colors[m]]),
    ...(open ? [["Open", open, "#8a90a6"]] : []),
  ];
  for (const [name, hours, color] of rows) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(PAD + 7, y + 11, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = `500 17px ${FONT}`;
    ctx.fillText(fit(ctx, name, 170), PAD + 24, y + 17);
    const barX = PAD + 210;
    const barW = W - PAD - barX - 150;
    roundRect(ctx, barX, y + 4, barW, 14, 7, "#eef0f5");
    if (hours)
      roundRect(
        ctx,
        barX,
        y + 4,
        Math.max(14, (barW * hours) / max),
        14,
        7,
        color,
      );
    const count = plan.tasks.filter((t) =>
      name === "Open" ? t.owner === null : t.owner === name,
    ).length;
    ctx.fillStyle = MUTED;
    ctx.font = `400 15px ${FONT}`;
    ctx.fillText(
      `${Number(hours.toFixed(2))}h · ${count} task${count === 1 ? "" : "s"}`,
      W - PAD - 130,
      y + 17,
    );
    y += 34;
  }

  // Calendar
  y += 30;
  ctx.fillStyle = INK;
  ctx.font = `600 22px ${FONT}`;
  ctx.fillText("Calendar", PAD, y + 22);
  ctx.font = `400 15px ${FONT}`;
  ctx.fillStyle = MUTED;
  const dueLabel = "● final deadline";
  const dueW = ctx.measureText(dueLabel).width;
  ctx.fillStyle = "#ab2828";
  ctx.fillText(dueLabel, W - PAD - dueW, y + 22);
  ctx.fillStyle = "#2546ee";
  const ciLabel = "◆ check-in";
  ctx.fillText(
    ciLabel,
    W - PAD - dueW - 24 - ctx.measureText(ciLabel).width,
    y + 22,
  );
  y += 44;
  const cellW = (W - PAD * 2) / 7;
  ctx.font = `600 13px ${FONT}`;
  DAY.forEach((d, i) => {
    ctx.fillStyle = MUTED;
    ctx.fillText(d.toUpperCase(), PAD + i * cellW + 10, y + 12);
  });
  y += 26;
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      const x = PAD + d * cellW;
      const cy = y + w * cellH;
      const inRange = date >= plan.today && date <= plan.deadline;
      ctx.lineWidth = 1;
      ctx.fillStyle = inRange ? "#ffffff" : "#f5f6fa";
      ctx.fillRect(x, cy, cellW, cellH);
      ctx.strokeStyle = LINE;
      ctx.strokeRect(x + 0.5, cy + 0.5, cellW, cellH);
      const isDeadline = date === plan.deadline;
      const isToday = date === today;
      const dayNum = Number(date.slice(8));
      ctx.font = `${isToday || isDeadline ? 700 : 500} 15px ${FONT}`;
      const label =
        dayNum === 1 || (w === 0 && d === 0)
          ? `${MONTH[Number(date.slice(5, 7)) - 1]} ${dayNum}`
          : String(dayNum);
      if (isToday) {
        const lw = ctx.measureText(label).width + 14;
        roundRect(ctx, x + 6, cy + 6, lw, 24, 12, INK);
        ctx.fillStyle = "#ffffff";
      } else ctx.fillStyle = inRange ? INK : "#a3a7b4";
      ctx.fillText(label, x + 13, cy + 23);
      if (isDeadline) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#ab2828";
        ctx.strokeRect(x + 2, cy + 2, cellW - 3, cellH - 3);
        ctx.lineWidth = 1;
        ctx.fillStyle = "#ab2828";
        ctx.font = `700 12px ${FONT}`;
        ctx.fillText("● DUE", x + cellW - 54, cy + 23);
      } else if (meetings.has(date)) {
        ctx.fillStyle = "#2546ee";
        ctx.font = `700 12px ${FONT}`;
        ctx.fillText("◆ CHECK-IN", x + cellW - 82, cy + 23);
      }
      const chips = plan.tasks.filter((t) => t.due === date);
      chips.slice(0, 4).forEach((task, i) => {
        const color = colorOf(task.owner);
        const chipY = cy + 36 + i * 26;
        roundRect(
          ctx,
          x + 6,
          chipY,
          cellW - 12,
          22,
          5,
          tint(color, task.done ? 0.08 : 0.16),
        );
        ctx.fillStyle = color;
        ctx.fillRect(x + 6, chipY, 4, 22);
        ctx.font = `500 13px ${FONT}`;
        ctx.fillStyle = task.done
          ? "#8a8d98"
          : isLate(task, today)
            ? "#ab2828"
            : INK;
        const text = fit(
          ctx,
          `${task.done ? "✓ " : ""}${task.name}`,
          cellW - 26,
        );
        ctx.fillText(text, x + 15, chipY + 16);
        if (task.done) {
          ctx.fillRect(x + 15, chipY + 11, ctx.measureText(text).width, 1);
        }
      });
      if (chips.length > 4) {
        ctx.font = `500 12px ${FONT}`;
        ctx.fillStyle = MUTED;
        ctx.fillText(
          `+${chips.length - 4} more`,
          x + 12,
          cy + 36 + 4 * 26 + 12,
        );
      }
    }
  }
  y += weeks * cellH;

  // Task list
  y += 30;
  ctx.fillStyle = INK;
  ctx.font = `600 22px ${FONT}`;
  ctx.fillText("Tasks", PAD, y + 22);
  y += 44;
  plan.tasks.forEach((task, i) => {
    const color = colorOf(task.owner);
    const rowY = y + i * 40;
    ctx.strokeStyle = LINE;
    ctx.beginPath();
    ctx.moveTo(PAD, rowY + 0.5);
    ctx.lineTo(W - PAD, rowY + 0.5);
    ctx.stroke();
    roundRect(
      ctx,
      PAD,
      rowY + 10,
      20,
      20,
      5,
      task.done ? "#1f9d63" : "#ffffff",
      task.done ? null : "#bfc3cf",
    );
    if (task.done) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(PAD + 5, rowY + 20);
      ctx.lineTo(PAD + 9, rowY + 24);
      ctx.lineTo(PAD + 15, rowY + 15);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.font = `500 16px ${FONT}`;
    ctx.fillStyle = task.done ? "#8a8d98" : INK;
    ctx.fillText(fit(ctx, task.name, 560), PAD + 34, rowY + 26);
    const owner = task.owner ?? "Open";
    ctx.font = `600 14px ${FONT}`;
    const ow = Math.min(ctx.measureText(owner).width + 24, 170);
    roundRect(ctx, PAD + 620, rowY + 8, ow, 24, 12, tint(color, 0.16));
    ctx.fillStyle = color;
    ctx.fillText(fit(ctx, owner, ow - 24), PAD + 632, rowY + 25);
    ctx.font = `400 15px ${FONT}`;
    ctx.fillStyle = !task.done && isLate(task, today) ? "#ab2828" : MUTED;
    ctx.fillText(pretty(task.due), PAD + 820, rowY + 26);
    ctx.fillStyle = MUTED;
    const hrs = `${task.hours}h`;
    ctx.fillText(hrs, W - PAD - ctx.measureText(hrs).width, rowY + 26);
  });
  y += plan.tasks.length * 40;

  // Footer
  ctx.fillStyle = MUTED;
  ctx.font = `400 14px ${FONT}`;
  ctx.fillText(
    "Hours are estimates. Agree on owners and dates as a team.",
    PAD,
    height - 34,
  );
  if (url) {
    ctx.font = `600 14px ${FONT}`;
    ctx.fillStyle = "#2546ee";
    const made = `Made with Fairshare · ${url}`;
    ctx.fillText(made, W - PAD - ctx.measureText(made).width, height - 34);
  }
  return height;
}

export async function posterBlob(plan, options) {
  await document.fonts?.load(`600 20px "Space Grotesk"`).catch(() => {});
  const scale = 2;
  const canvas = document.createElement("canvas");
  const height = drawPoster(canvas.getContext("2d"), plan, {
    ...options,
    measure: true,
  });
  canvas.width = W * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  drawPoster(ctx, plan, options);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
