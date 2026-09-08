# Architecture

Fairshare is a static application using browser-native HTML, CSS, and JavaScript. It has no runtime package dependencies or API service.

## Data flow

1. The form collects a project name, deadline, teammate aliases, tasks, and effort estimates.
2. `buildPlan` validates the input, assigns tasks by descending effort to the least-loaded teammate, and suggests dates in task order.
3. `app.js` renders the returned plan using text nodes and labeled controls.
4. Owner/date/completion edits update the in-memory plan. Workload totals recalculate after reassignment.
5. Copy and download export the current plan as plain text.

Editing the original inputs does not alter an existing plan until it is rebuilt. The interface explains this boundary. Sample provenance belongs to the generated plan and remains attached to exports until a new plan is built.

## Scheduling limits

The algorithm balances estimated hours, not individual capacity or task difficulty. It does not model dependencies, collaboration, or meeting attendance. Tasks due tomorrow are suggested for today so the deadline day remains available for review. Same-day projects stay on that date. Users can adjust all suggested dates within the project window.

## Verification

Run `npm test` for deterministic behavior and input-rejection checks. `npm run build` creates a fresh deployable directory from an explicit file allowlist. Deployment requires a successful test job.

Browser qualification should cover generation, reassignment, date changes, completion, clipboard output, file download, invalid inputs, unsaved-input protection, and mobile overflow. Automated unit tests do not establish user adoption or presentation readiness.
