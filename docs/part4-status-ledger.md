# Part 4 status ledger (items 190-227)
Evidence scope: local embedded PostgreSQL 18, local production build. Not Neon, not deployed, not real S3. Every access mapping here is PROPOSED, pending user review.

## Implemented + tested (local)
- 190, 193-199, 201-204 case finance: migration 20261126230000, API, panel, AR/EN/FR invoice PDF, CSV/XLSX export. e2e + unit. UI verified (due-date fix re-verified in the final UI pass).
- 205, 208, 210 workflow rules: engine, API, cron endpoint, panel. e2e. Nothing enabled by default. Cron NOT scheduled (vercel.json untouched).
- 211 senior dashboard: counts only, walled cases excluded. e2e.
- 212, 213 period report: JSON/XLSX + panel. e2e.
- 214 client PDF: generate only, client-safe fields + lawyer-typed summary, text extracted with pdftotext in the e2e.
- 215 file completeness: transparent 8-criterion checklist, panel. Not a legal-quality judgment. unit + e2e.
- 216 client journey: funnel from appointment requests to confirmed to has-a-case. e2e. Lead source and loss reason are NOT recorded anywhere, so not reported.
- 218 Telegram: existing sender covers task events; workflow gets a generic count-only ping. Config-gated (no bot token here, so no real send tested).
- 226 camera capture: local enhance then the existing upload. Unit tested. S3 upload path not testable here.
- 227 location proof: per-use consent, one per record and phase, own-or-senior read. e2e. Browser geolocation prompt not UI-tested. Item 102 stays no-location.
- Attendance: 102 (court arrival/departure taps) UI-verified at the session page. 187 (office check-in/out) API-tested only, NOT UI-verified.

## Genuinely blocked (dependency)
- 223 Google Calendar sync: needs Google calendar scope and credentials. ICS export exists.
- 218 real delivery: needs the Telegram bot token and group id configured.

## Partial / by design not enabled
- 224 PWA: manifest and push-only service worker exist. No offline caching of signed-in pages.
- 225 offline: only a proposed queue design. Sensitive offline persistence stays DISABLED pending the user's privacy choice.

## Still to build
- none known beyond the items above; anything not listed here was done in Parts 1-3.
