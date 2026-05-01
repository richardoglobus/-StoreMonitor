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
- **Username:** `admin`
- **Password:** `admin123`

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
