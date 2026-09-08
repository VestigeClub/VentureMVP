# AI and build log

| Date / stage | Prompt or specification | Change | Inspection / test | Human judgment |
|---|---|---|---|---|
| 2026-09-08 / discovery | Review assignment and clone VentureMVP | Cloned professor-derived starter | Read source and professor example | Owner needs solo submission |
| 2026-09-08 / choice | Offer feasible ideas and ask clarifying questions | Selected group project planner | Owner reports 1–3 available testers | Owner chose idea, local-only work, one-hour deadline, direct build |
| 2026-09-08 / experiment | Define meaningful interaction and precommitted rule | Wrote H1 and test script before testing | Rule distinguishes incomplete sample, intended use, actual adoption | Owner must review and conduct voluntary test |
| 2026-09-08 / implementation | Create working planner and evidence package | AI authored HTML/CSS/JS, workload balancing, editable owners/dates, export, draft economics | Node tests and browser validation; see README | Economics are assumptions, not verified demand |

## Team ownership
- Student: [YOUR NAME]
- Solo project. Student owns concept acceptance, user recruitment/consent, observed evidence, economic judgments, revision decisions, and final submission.
- AI assistance: Codex generated implementation, test code, and draft documentation. Student should review and be able to explain each before submitting.
- No model API is called by the website. Workload allocation is a deterministic largest-task-first algorithm.
- No customer evidence, sales, quotes, or participant feedback was invented.
- Pending: record participant sessions, exact evidence-led revision and any second test, final publication and checks.

Developer validation: 9 Node tests passed. Browser checks confirmed sample generation, live load recalculation after owner change, completion controls, copy success feedback, and invalid-hour error. Responsive DOM width at 390px had no horizontal overflow. Initial full-page screenshots were malformed by the capture tool; native viewport screenshots were used for visual review. Clipboard content and downloaded file were not independently inspected in the browser.

## Rubric-led redesign, before customer testing
Owner requested a distinctive site and a related Pitch 1 deck, then supplied the detailed rubric. Owner confirms no user testing or practice pitch yet and requires local review before publication.

AI replaced the green/cream starter-like visual treatment with white/ink/cobalt and self-hosted Space Grotesk (SIL Open Font License included). Task input now uses labeled task/effort rows, add/remove controls, workload bars, and inline protection before sample replacement. A separate generated-plan flag preserves sample labels after input edits. These are design/developer improvements, not customer-led revisions.

Full-rubric review narrowed the customer to a coordinator with an assignment due within seven days and revised H1 before any sessions. Version 2 requires actual voluntary placement in an existing team workflow. Version 1 was never run. Both provenance and timing are documented in EXPERIMENT.md.

Validation: 9 Node checks pass; browser actions verified workload editing, date editing, completion, copy output including retained sample marker, and cancellation preserving an unsaved task. Mobile DOM width matched 390px with no horizontal overflow. Independent source/visual review requested two state/protection corrections, now applied. Browser automation encountered screenshot scaling and occasional dispatch timeouts; native captures and fresh accessibility state were used rather than treating failed automation as successful validation.

Pitch: AI created a three-slide editable PowerPoint and timed rehearsal script with a 15-second live demo. All three rendered slides were visually inspected and package/layout checks passed. The local URL is disclosed. The student must conduct the practice, respond to actual advice, and use the resulting slides for the graded attempt. No practice-induced revision is claimed.

Deployment preparation: static build copies only runtime files and licensed font assets to dist/. No source was pushed or site published. Browser download-event detection timed out in the in-app browser; this is not logged as a verified file download. Clipboard text was verified by pasting into a disposable local form field.
