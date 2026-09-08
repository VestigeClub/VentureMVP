---
name: Fairshare
description: A cobalt and white project worksheet that gives every task an owner.
colors:
  ink: "#17191f"
  muted: "#60636e"
  paper: "#ffffff"
  input-surface: "#ffffff"
  result-surface: "#f5f6fa"
  line: "#dddfe6"
  accent: "#2546ee"
  error: "#ab2828"
rounded:
  control: "6px"
  workspace: "12px"
---

## Overview

Fairshare combines a distinctive cobalt identity with a practical white worksheet. The large promise, “Give every task an owner,” leads directly into task entry and a reviewable plan. The authored F mark, consistent typography, and workload bars give the product a recognizable visual language without obscuring the work.

## Colors

Near-black ink carries headings and body text. Cobalt identifies the core promise, primary actions, brand mark, and workload bars. Muted text supports instructions. White fields sit on a very pale output surface; thin neutral rules separate tasks. Red identifies validation errors.

## Typography

Self-hosted Space Grotesk supplies both display and interface text, with a 16px base. The main heading uses a 3.4rem–5.1rem fluid scale, 600 weight, and 1.03 line height; mobile uses 3.5rem. Secondary instructions have a 0.8rem minimum. Task names use medium weight. Paragraphs are limited to 70ch and workload totals use tabular numerals.

## Layout

The page has a 1360px maximum width, with 44px desktop outer spacing. Desktop places assignment inputs on the left and the editable plan on the right, in a 1:1.12 ratio. Worksheet padding is 28px. At 700px and below, input precedes output in one column with 18px inner padding. Task entry pairs each name with a numeric hours field and remove action. Output keeps owner and due date together in two columns.

## Elevation & Depth

Flat surfaces use background tones and thin dividing rules rather than shadows. The result remains part of the worksheet rather than a floating panel.

## Shapes

Inputs and buttons have gently rounded corners; the enclosing worksheet has a larger radius. Primary actions are at least 48px tall, entry inputs 46px, and output fields 42px. Native completion checkboxes sit beside clickable task labels. Slim rounded workload tracks visualize relative estimated effort.

## Components

Primary buttons use cobalt with white text; secondary export uses a white outlined button. Hover darkens or tints the surface. Keyboard focus uses an orange outline. Text selection uses pale blue. Workload bars animate width after reassignment; reduced motion disables transitions and smooth scrolling.

Task rows combine a completion checkbox, task name, effort, owner selector, and date input. Completion strikes through the task name. Workload bars and totals update when ownership changes. The empty state sketches three unassigned tasks. Sample replacement offers an inline choice to replace or keep existing work. Sample badges and export markers describe the generated plan even when inputs change. Validation and export status copy explain the next action in plain language.

## Do's and Don'ts

- Do preserve the worksheet hierarchy and readable native controls.
- Do keep mobile fields and export actions inside the viewport.
- Do distinguish example data and explain when rebuilding replaces edits.
- Don't obscure the working plan with decorative layers or low contrast text.
