# Fairshare — BUSFIN 4215 Venture MVP

Turn a group assignment into an editable work plan with suggested owners, dates, and a text export.

## Run locally

`npm run serve`, then open http://localhost:8000. Run `npm test` for automated checks.
No install step, external runtime service, accounts, analytics, or persistent browser storage is required. Reload clears the working plan. Use aliases; downloaded files contain what the user entered.

## Mechanism and limitations

Tasks are assigned largest-estimated-effort first to the lowest-load teammate. Dates follow the original task order between today and the day before the deadline; same-day work stays today. Owners and dates are editable. It does not reason about skills, availability, dependencies, or feasibility. Teammates must agree to the plan themselves.

## Submission status

Distinctive redesigned local prototype built. Public URL pending owner approval. Participant evidence and evidence-led revision pending. Student name pending.

- EXPERIMENT.md: precommitted hypothesis and rule
- TEST_SCRIPT.md: ethical five-minute test protocol
- EVIDENCE.md: pending anonymous actual results
- ECONOMICS.md: explicit economic assumptions and sensitivity
- BUILD_LOG.md: AI assistance and student ownership
- REVISION_RECEIPT.md: distinguish build changes from future evidence-led revision
- PITCH_REVISION.md: pending actual practice advice and revised claim

## Publication

Do not push or publish until the owner approves. GitHub Actions runs npm test, builds runtime files with npm run build, and can deploy dist/ to Pages after approval and repository configuration. Study records are excluded from the deployed website. Verify the actual public URL before recording it or submitting. A localhost URL cannot be submitted as the required public live site.

## Validation

Automated checks cover balanced allocation, input rejection, task order, review-day scheduling, same-day deadlines, and edited exports, plus inherited starter experiment tests. Browser checks are developer validation, never user-test evidence.
