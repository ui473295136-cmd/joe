# Regression checks

Run `npm ci && npm test` with Node 22.13 or newer. Tests use isolated in-memory data through jsdom; they never authenticate as travellers or write to the live trip.

Covered: four identities and navigation, dirty profile fields, avatar crop geometry at 264/300 CSS pixels, modal dismissal, duplicate expense submissions, failed inspiration votes, map reopen, remembered device sessions, expiry/revocation/network recovery, and server API authorization.

2026-09-15 release verification: all 22 isolated tests passed. The repository's existing GitHub Actions browser regression also passed PIN flows, all four identities at a 390-pixel mobile viewport, avatar upload and map failover (run 34919251269, attempt 2). The published login screen shows the default remembered-device option. Live read-only checks confirmed the auth status endpoint responds successfully and the sync, profile, trash and remember-device actions reject missing/invalid sessions with HTTP 401. Existing service-role access is retained while direct anonymous access to the four previously exposed tables is disabled.

Browser review still needed on actual iOS Safari / Android WeChat for file pickers, touch gestures, safe areas, GPS permission UI and background resume. Local browser previews were unavailable in the review environment, so passing DOM/logic tests is not a claim of a full real-device test.
