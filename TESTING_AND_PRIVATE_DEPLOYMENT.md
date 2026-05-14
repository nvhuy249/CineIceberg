# CineIceberg Testing + Private Deployment Playbook

## Goal
Use a structured process with a very small tester pool (you + your brother) to gather useful recommendation/matching data, then distribute private builds outside public app stores.

## Part 1: Structured Testing With 2 Testers

### 1) Create Test Personas
Create separate accounts to simulate different tastes:

- `sci_fi_slowburn`
- `thriller_twist`
- `comfort_romcom`
- `mixed_casual`

You can rotate between these personas even if only 2 humans are testing.

### 2) Weekly Session Protocol
For each persona, run **3 sessions per week**.  
In each session do:

- `10-20` Discover swipes
- `5` Search result opens
- `3` Add-to-watchlist actions
- `1` Remove-from-watchlist action
- `1` Watchlist recommendation refresh

### 3) Capture Ground Truth Labels
For each recommendation shown, add a manual label:

- `relevant`
- `not_relevant`

Even a simple spreadsheet is enough for MVP-stage evaluation.

### 4) Track Core Metrics
Calculate per persona, per week:

- `open_rate = opens / impressions`
- `like_rate = likes / swipes`
- `save_rate = adds / opens`
- `dismiss_rate = removes / saves`
- `repeat_genre_ratio` (how repetitive recommendations are)

### 5) Compare Algorithm Versions
Tag each recommendation batch with an `algorithm_version` (e.g. `v0.1`, `v0.2`) and compare metrics week-to-week.

Suggested process:

1. Week A runs `v0.1`
2. Week B runs `v0.2`
3. Compare open/like/save/dismiss and relevance labels
4. Keep the better version

## Part 2: Data You Should Log

Your current interaction logging is movie-id based (`tmdb_id`), so query typing is not captured.

Keep logging:

- `open`
- `like`
- `pass`
- `add`
- `remove`

For search quality analysis, add a separate table for query events:

- `search_events(user_id, query, source, created_at)`

## Part 3: Private Deployment (No Public Store)

## Android (easiest)
Build and share an APK directly:

1. `eas build -p android --profile preview`
2. Download the APK
3. Send to tester for sideload install

## Expo Private Testing
Use Expo project sharing for controlled testers:

1. Keep project private in Expo account
2. Share access link/QR only with testers
3. Use development/preview builds

## iOS (outside App Store)
Use one of:

- Ad Hoc distribution (device UDID registration)
- TestFlight (Apple-managed private testing)

For a tiny tester pool, Ad Hoc or TestFlight is usually enough.

## Part 4: Weekly Checklist

Run this every week:

1. Run all persona sessions
2. Export interaction/search logs
3. Compute core metrics
4. Review failed/irrelevant recommendations
5. Adjust scoring rules
6. Increment `algorithm_version`
7. Repeat

## Notes

- With very small data, use rule-based ranking first.
- Add ML/ranking model later when event volume is large enough.
- Keep this app private while you confirm TMDB policy fit for your intended distribution scope.
