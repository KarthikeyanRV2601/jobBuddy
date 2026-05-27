# JobBuddy

JobBuddy is a local-first React + TypeScript application for tracking job leads, application status, notes, submitted skill context, and Gmail-style status signals.

## Current Features

- Application tracker with company, role, source, deadline, status, next action, notes, and submitted skill context.
- Pipeline metrics for active, interview, offer, and rejected applications.
- Gmail read-only OAuth connection for syncing recent job-application emails.
- Automated tracker creation from synced Gmail messages.
- Email analyzer that detects likely job status signals from synced or pasted email text.
- Typed local storage persistence.
- Strict TypeScript with domain logic kept in utilities.

## Run Locally

```bash
npm install
npm run dev
```

## Run As A Local App

```bash
npm run local:app
```

Or double-click:

```text
scripts/start-jobbuddy.command
```

This builds the app and serves it at `http://127.0.0.1:4173/`.

## Gmail Setup

1. Create a Google Cloud OAuth client for a web application.
2. Add `http://localhost:5173`, `http://127.0.0.1:5173`, and `http://127.0.0.1:4173` as authorized JavaScript origins.
3. Copy `.env.example` to `.env`.
4. Set `VITE_GOOGLE_CLIENT_ID` to your OAuth client ID.
5. Start the app and use `Connect Gmail` from the dashboard.

The app requests read-only Gmail access and keeps the access token in memory for the current browser session.

## Scripts

```bash
npm run dev
npm run build
npm run local:app
npm run local:serve
npm run typecheck
```

## Next Milestones

- Add Google OAuth and Gmail API sync.
- Add automatic email polling and notification rules.
- Add search filters, CSV import/export, and resume version tracking.
- Add company lead discovery and scoring.
