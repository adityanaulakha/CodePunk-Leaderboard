# CodePunk v2.0 — Realtime Leaderboard

Realtime leaderboard + organizer admin dashboard for CodePunk v2.0 (Droid Club, GLA University).

## Features

- Public leaderboard table (S.No, Team, Round 1, Round 2, Final, Total)
- Auto-sorts by Total (descending)
- Realtime updates via Firebase Firestore subscriptions
- Smooth rank swaps via Framer Motion layout animations
- Updated rows briefly glow/pulse
- Admin dashboard: add teams, edit scores, delete teams, CSV import

## Pages

- `/` Public leaderboard
- `/admin` Organizer admin panel

## Database schema (Firestore)

Collection: `teams`

Each doc:

- `name` (string)
- `round1` (number)
- `round2` (number)
- `finalEval` (number)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

Total is computed client-side:

- `total = round1 + round2 + finalEval`

## Admin security model

Writes are restricted to organizer accounts.

1) Enable Firebase Auth (Email/Password)
2) Create organizer users in Auth
3) For each organizer, create a Firestore document:

- `admins/{uid}` (empty doc is fine)

4) Apply the rules in `firestore.rules`

## Firebase setup

Create a Firebase project, then create a `.env` file in the project root:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Then run:

```bash
npm run dev
```

## CSV import format

Supported headers:

- `name`, `round1`, `round2`, `finalEval`

Also accepted:

- `Team Name`, `Round 1`, `Round 2`, `Final Evaluation`
