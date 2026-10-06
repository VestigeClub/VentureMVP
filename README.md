# Fairshare

Fairshare turns a group assignment into an editable plan with task owners, estimated effort, and suggested due dates.

- **Balance or claim:** let Fairshare balance estimated hours, or leave tasks open so teammates claim their own and balance the leftovers in one click.
- **Live team links:** copying the team link creates one shared plan that every teammate on the link can edit at the same time (claims, dates, done marks), synced through Firebase Realtime Database. No accounts. If live sync is unavailable, the link falls back to a snapshot that carries the plan after the `#`.
- **Team assistant and log:** every live plan has a shared log. Teammates post notes and ask an AI assistant (Claude) about the plan, such as who is behind or how to split a task. Entries are time-stamped by the database and can't be edited or deleted, and the log downloads as a CSV for instructors. Setup: [relay/README.md](relay/README.md).
- **Missing-task checker and templates:** paste the assignment brief to catch tasks your list skips, or start from a presentation, paper, case study, or lab report.
- **Calendar view:** switch the plan to a week-by-week calendar, drag tasks between days, and tap a task to change its owner, date, or mark it done. Shared links open in this view.
- **Plan image:** download a shareable picture of the plan with workload bars, a calendar of every due date and check-in, and the full task list.
- **Check-ins:** suggested check-in dates, a ready-to-paste status message, and a calendar file with due-date reminders for the team or one person.
- **Saved plans:** plans are kept in this browser so you can pick up where you left off.
- **Instructor templates:** share one task list and deadline with a whole section; every team adds its own names.

[Open Fairshare](https://VestigeClub.github.io/VentureMVP/)

## Run locally

Requires Node.js 22 or later for tests/builds and Python 3 for the local server. No package installation is needed.

```sh
npm test
npm run build
npm run serve
```

Open http://localhost:8000. The deployable website is built in `dist/`.

## How planning works

The planner assigns the largest estimated task to the teammate with the lowest assigned workload, then repeats. It preserves the original task order when suggesting dates and reserves the final day for review when possible. Owners and dates remain editable.

This is a draft, not a feasibility guarantee. The algorithm does not account for skills, dependencies, or personal availability. A team should agree on the plan before using it. The current plan is kept in the address bar and in this browser, so refreshing does not lose it.

## Project structure

```text
index.html           Page structure and accessible forms
app.js               Input, editing, workload display, and export
planner.js           Allocation, date validation, and text formatting
styles.css           Responsive layout and visual styles
assets/fonts/        Self-hosted font and license
scripts/             Static build
test/               Planner and build checks
docs/               Architecture, security, and coursework records
```

## Deployment

GitHub Actions tests pull requests and changes to `main`. A successful push to `main` builds and deploys `dist/` to GitHub Pages. Only runtime files and font assets enter the site artifact. The workflow uses commit-pinned actions and grants deployment permissions only to the deployment job.

## Privacy and security

The app has no accounts, analytics, or third-party scripts. Plans are saved in the browser (localStorage) and can be deleted from the page. Copying a team link stores that plan in Firebase Realtime Database under an unguessable 128-bit ID; database rules block listing, so only people holding the link can read or edit it. Use aliases and avoid sensitive information. See [security notes](docs/security.md) for controls and limitations.

[Release checks](docs/release-checks.md) record the deployed workflow and known verification limits.

## Coursework

Built for BUSFIN 4215. [Coursework records](docs/coursework/README.md) describe the experiment, economics, AI assistance, and current evidence. They distinguish implemented features from untested business assumptions and unfinished participant work.

## License

See [LICENSE](LICENSE). Space Grotesk is distributed under the [SIL Open Font License](assets/fonts/OFL.txt).
