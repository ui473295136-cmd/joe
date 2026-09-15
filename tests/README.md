# Regression checks

Run `npm ci && npm test` with Node 22.13 or newer. Tests use isolated in-memory data through jsdom; they never authenticate as travellers or write to the live trip.

Covered: four identities and navigation, dirty profile fields, avatar crop geometry at 264/300 CSS pixels, modal dismissal, duplicate expense submissions, failed inspiration votes, map reopen, remembered device sessions, expiry/revocation/network recovery, and server API authorization.

Browser review still needed on actual iOS Safari / Android WeChat for file pickers, touch gestures, safe areas, GPS permission UI and background resume. Local browser previews were unavailable in the review environment, so passing DOM/logic tests is not a claim of a full real-device test.
