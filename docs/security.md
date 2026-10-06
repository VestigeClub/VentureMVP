# Security and privacy

## Scope

Fairshare processes user input in a browser tab. It does not authenticate users, accept payments, or call a model API. Live team plans are stored in Firebase Realtime Database. It has no runtime package dependencies.

## Controls

- User-provided names and task text are rendered through text nodes, not interpreted as HTML.
- Input checks reject invalid dates, duplicate aliases, invalid effort estimates, and oversized task/member counts.
- A Content Security Policy restricts scripts, styles, fonts, and images to the site, disables application network connections, and blocks form submission, plugins, and base-URL changes. The small favicon uses a data URL.
- Fonts are self-hosted. No analytics or third-party scripts are loaded.
- The referrer policy is `no-referrer`.
- The build copies only known runtime files and font assets. Coursework and internal files are excluded from the website artifact.
- GitHub Actions use full commit references. Test/build jobs have read-only repository access; only the deployment job can publish to Pages.

## Data handling

Plans are kept in this browser's localStorage (up to 10 plans; each can be deleted on the page). Copying a team link stores the encoded plan in Firebase Realtime Database at `plans/<id>`, where the ID is 128 random bits from `crypto.getRandomValues`. Database rules deny reads and writes at the root (so plans cannot be listed), allow access only to IDs of at least 20 characters, and reject entries that are not a string under 20,000 characters. The ID is the only credential: anyone with a live link can read and edit that plan, and there is no per-user access control or edit history. Data received from the database goes through the same strict decoder as links. The page's Content Security Policy only allows connections to Firebase database hosts. Snapshot and template links contain the plan or task list in the URL fragment, which is not sent to the web server. Opened links are decoded with strict validation (lengths, member list, owners, and dates) and rendered as text only; a damaged or tampered link shows an error instead of loading. Calendar exports are generated locally. Copying places the plan on the system clipboard; downloading creates a local text file. Users control further sharing and should avoid sensitive information. The site does not record participant study behavior.

## Limitations

GitHub Pages controls hosting and HTTP headers. A meta Content Security Policy cannot supply every header-level protection, including `frame-ancestors`. Hosting providers may retain ordinary request logs. This repository's security checks are a bounded review, not a penetration test or a guarantee against all vulnerabilities.

## Reporting an issue

For a suspected vulnerability, contact the repository maintainer privately before publishing details. Do not include credentials, personal data, or participant records in public issues.

## Team log and assistant

Each live plan has a log at `logs/<id>`. Database rules allow a client to create a new entry of type `note` only, never to change or delete one, and require the database's own server timestamp, so times can't be backdated. Questions to the assistant go to a Cloudflare Worker (`relay/worker.js`) that holds the Anthropic API key and a database secret. The Worker only accepts requests from the site's origin, checks the plan exists, enforces a daily question limit, and writes both the question and Claude's answer to the log itself, so assistant answers can't be forged from a browser. Names in the log are chosen by teammates and are not verified identities. The plan, the recent log, and the question are sent to Anthropic's API to produce an answer. Answers are rendered as plain text.
