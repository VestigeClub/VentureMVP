# Security and privacy

## Scope

Fairshare processes user input in a browser tab. It does not authenticate users, accept payments, store data on a server, or call a model API. It has no runtime package dependencies.

## Controls

- User-provided names and task text are rendered through text nodes, not interpreted as HTML.
- Input checks reject invalid dates, duplicate aliases, invalid effort estimates, and oversized task/member counts.
- A Content Security Policy restricts scripts, styles, fonts, and images to the site, disables application network connections, and blocks form submission, plugins, and base-URL changes. The small favicon uses a data URL.
- Fonts are self-hosted. No analytics or third-party scripts are loaded.
- The referrer policy is `no-referrer`.
- The build copies only known runtime files and font assets. Coursework and internal files are excluded from the website artifact.
- GitHub Actions use full commit references. Test/build jobs have read-only repository access; only the deployment job can publish to Pages.

## Data handling

Plans are kept in the URL fragment and in this browser's localStorage (up to 10 plans; each can be deleted on the page). Fragments are not sent to the web server. Team and template links contain the plan or task list, so anyone with a link can read it. Opened links are decoded with strict validation (lengths, member list, owners, and dates) and rendered as text only; a damaged or tampered link shows an error instead of loading. Calendar exports are generated locally. Copying places the plan on the system clipboard; downloading creates a local text file. Users control further sharing and should avoid sensitive information. The site does not record participant study behavior.

## Limitations

GitHub Pages controls hosting and HTTP headers. A meta Content Security Policy cannot supply every header-level protection, including `frame-ancestors`. Hosting providers may retain ordinary request logs. This repository's security checks are a bounded review, not a penetration test or a guarantee against all vulnerabilities.

## Reporting an issue

For a suspected vulnerability, contact the repository maintainer privately before publishing details. Do not include credentials, personal data, or participant records in public issues.
