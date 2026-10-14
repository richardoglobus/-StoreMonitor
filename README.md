# Mukurweini Hospital Stores App

## Requirements
- **Node.js** (v18 or newer) — download from https://nodejs.org
- That's it. No PostgreSQL, no pnpm, no Docker needed.

## First-Time Setup (do this ONCE)

Open a terminal in this folder and run:

```
cd backend
npm install

cd ../frontend
npm install
```

## Running the App

### Option A — Windows: Double-click `START.bat`
This opens two terminal windows (backend + frontend) automatically.

### Option B — Manual (Mac/Linux/Windows)

**Terminal 1 — Backend:**
```
cd backend
node server.js
```

**Terminal 2 — Frontend:**
```
cd frontend
npx vite
```

Then open **http://localhost:5173** in your browser.

## Login
- Normal sign-in requires the account password followed by a six-digit Email OTP sent to its **existing verified email**.
- Accounts without a verified email (including phone-only accounts and administrators) must **contact an administrator**. Login cannot add or change contact details.
- In **User Management → Add/Edit User → Sign-in security**, administrators can confirm ownership of an email through a trusted process and approve **Allow password-only sign-in (skip Email OTP)** for selected users. This exemption is off by default, logged, and still requires a verified email. Disabled accounts remain blocked.
- Changing an email clears its old verification and pending login/recovery codes. The administrator must confirm the new address. Login request fields cannot grant verification or an exemption.

### Email delivery setup
- Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` on the backend. Use the sender configured for your Resend account. Keep credentials out of source control.
- Set a strong `SESSION_SECRET` for production. OTPs are session-bound and stored as keyed hashes, never as plaintext.
- Login OTP expiry follows **Settings → OTP expiry** (bounded to 1–30 minutes); resend cooldown follows the OTP cooldown setting (bounded to 10–1800 seconds). There are at most five sends and five failed verification attempts per account in a 15-minute window. New login requests or resends do not reset the attempt limit.
- For local development only, `OTP_DEV_MODE=true` can log codes when Resend is not configured. This fallback is disabled in production, and login never returns codes in its API response.

**Before deploying or restarting with this change:** ensure at least one administrator has a verified email using a trusted administrative process, and configure Resend. Legacy/default accounts without a verified contact cannot sign in; there is no automatic administrator bypass. This code does not modify existing account data during deployment.

### Security regression tests
From `backend`, run `npm test`. The tests use in-memory data and mocked email delivery; they do not send real email or modify the app's store.

## Data Storage
All data is saved in `backend/store.json` — a plain JSON file.
No database setup required. Data persists between restarts.

## Features
- Dashboard with charts and low-stock alerts
- 25 pre-loaded hospital departments
- 110 pre-loaded medical supply items
- Record issues (with voucher support), receipts (KEMSA/MEDS), purchases
- Per-department inventory with opening balance tracking
- Monthly reports with CSV export
- User management (admin only)

## Deploy Live (Render)
This project includes `render.yaml` for one-click deployment.

1. Push this project to GitHub.
2. In Render, click **New +** -> **Blueprint**.
3. Select this repository and deploy.

Render will build the frontend and serve the full app (frontend + API) from one URL.

### Production data note
- App data is saved to `backend/store.json`.
- On free hosting, local file storage may reset after redeploy/restart.
- For reliable long-term production data, use persistent storage or a database.
