# Fairshare

Fairshare turns a group assignment into an editable plan with task owners, estimated effort, and suggested due dates. Plans can be copied to a group chat or downloaded as a text file.

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

This is a draft, not a feasibility guarantee. The algorithm does not account for skills, dependencies, or personal availability. A team should agree on the plan before using it. Refreshing or closing the tab clears the working session.

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

The app has no accounts, analytics, third-party scripts, or server-side storage. Entered content remains in the browser tab until the user copies or downloads it. Use aliases and avoid sensitive information. See [security notes](docs/security.md) for controls and limitations.

## Coursework

Built for BUSFIN 4215. [Coursework records](docs/coursework/README.md) describe the experiment, economics, AI assistance, and current evidence. They distinguish implemented features from untested business assumptions and unfinished participant work.

## License

See [LICENSE](LICENSE). Space Grotesk is distributed under the [SIL Open Font License](assets/fonts/OFL.txt).
