# Mukurweini Hospital Stores App — Project Log

**Project:** StoreMonitor — A full-stack hospital inventory management system  
**Developer:** Lewis Murimi (richardoglobus)  
**Stack:** Node.js + Express + LowDB (backend) · React + Vite + TypeScript + TailwindCSS (frontend)  
**Hosting:** Railway (current) → Render + Vercel (planned free migration)  
**Live URL:** https://storemonitor.up.railway.app  
**GitHub:** https://github.com/richardoglobus/-StoreMonitor  

---

## Table of Contents

1. [Initial Deployment to Railway](#1-initial-deployment-to-railway)
2. [Login & Session Fix](#2-login--session-fix)
3. [Dashboard Improvements](#3-dashboard-improvements)
4. [CSV Download Fix](#4-csv-download-fix)
5. [Dark / Light Mode](#5-dark--light-mode)
6. [Monthly Report](#6-monthly-report)
7. [Item Catalog Improvements](#7-item-catalog-improvements)
8. [Issue Voucher — Per-Item Folio Number](#8-issue-voucher--per-item-folio-number)
9. [Department Section — Tue/Fri Grid](#9-department-section--tuefri-grid)
10. [All-Departments Excel Export](#10-all-departments-excel-export)
11. [Low Stock Alert Fixes](#11-low-stock-alert-fixes)
12. [Inactivity Auto-Logout](#12-inactivity-auto-logout)
13. [Admin Settings Page](#13-admin-settings-page)
14. [Excel Exports — Monthly Report & All Departments](#14-excel-exports--monthly-report--all-departments)
15. [Purchases Page Upgrade](#15-purchases-page-upgrade)
16. [Stock Valuation Report](#16-stock-valuation-report)
17. [Backup & Restore](#17-backup--restore)
18. [Animated Login Page](#18-animated-login-page)
19. [Appearance — Logo & Theme Picker](#19-appearance--logo--theme-picker)
20. [Hosting Discussion](#20-hosting-discussion)
21. [Full File Reference](#21-full-file-reference)

---

## 1. Initial Deployment to Railway

**Problem:** App running locally on PM2 but not accessible online.

**Steps taken:**
- Installed PM2 globally and registered `hospital-stores` process
- Created root `package.json` with `postinstall` script to install backend dependencies:
```json
{
  "name": "storemonitor",
  "scripts": {
    "postinstall": "cd backend && npm install",
    "start": "node backend/server.js"
  }
}
```
- Created `.gitignore` excluding `node_modules` and `.env`
- Fixed git branch from `master` → `main` for Railway compatibility
- Added GitHub Personal Access Token for push authentication
- Set Railway environment variables:
  - `NODE_ENV=production`
  - `SESSION_SECRET=mukurweini-hospital-2024-secret-key`
  - `DATA_PATH=/app/data/store.json`
- Added Railway persistent volume at `/app/data` to protect `store.json` data

**Files changed:** `package.json`, `.gitignore`, `backend/server.js`

---

## 2. Login & Session Fix

**Problem:** Login said "success" but stayed on login page — did not redirect to dashboard.

**Root cause:** Railway sits behind a reverse proxy. Express was not trusting proxy headers so session cookies were rejected as insecure.

**Fix:** Added `app.set("trust proxy", 1)` to `server.js`.

---

## 3. Dashboard Improvements

### 3.1 Colorful Department Usage Chart
- Changed single-color bar chart to multi-color bars using Recharts `<Cell>` component
- 20 distinct colors cycling through departments
- Only departments with actual issues are shown (filters zero-activity departments)
- X-axis labels rotated -45° and abbreviated to fit

### 3.2 Live Clock & Date
- Added `LiveClock` component with real-time `HH:MM:SS` counter and full date (`Monday, 9 May 2026`)
- Updates every second using `setInterval`

### 3.3 Date Range Picker
- Replaced `MonthPicker` on Dashboard with `DateRangePicker` (From/To date inputs)
- All pages updated: Dashboard, Reports, Exports, Issues Log, Purchases

### 3.4 Low Stock Alert Panel
- **Deduplication:** Each item appears only once (worst balance across departments wins)
- **No department names** shown in the panel
- Scrollable full list — no "+ 44 more" truncation
- `OUT OF STOCK` badge in red for zero/negative balances
- `⚠ N units` badge in amber for items above zero but below threshold
- Stat card count derived from same data as panel (always consistent)

### 3.5 Next Issue Day
- Auto-refreshes every 60 seconds
- Shows actual weekday name and formatted date

---

## 4. CSV Download Fix

**Problem:** All CSV download buttons said "Export failed — check you are logged in."

**Root cause:** Using `<a href download>` does not send session cookies on Railway HTTPS. The server returned 401.

**Fix:** Replaced all download links with `fetch()` calls using `credentials: "include"`:
```javascript
const res = await fetch(url, { credentials: "include" });
const blob = await res.blob();
const a = document.createElement("a");
a.href = URL.createObjectURL(blob);
a.download = filename;
a.click();
```
Applied to: Issues CSV, Inventory CSV, Monthly Report CSV, Purchases CSV, all Excel exports.

---

## 5. Dark / Light Mode

- Added `ThemeProvider` in `App.tsx` wrapping the entire app
- Toggle button (Sun/Moon icon) in sidebar bottom and mobile header
- Persists preference in `localStorage`
- Fixed calendar date input visibility in dark mode using `[color-scheme:dark]` CSS class

---

## 6. Monthly Report

### 6.1 Format
- Completely rewrote `buildReport()` in `server.js`
- **One table per commodity** spanning all months (not one section per month)
- Each month within a commodity shows:
  - **Opening balance** — 1st day of month
  - **One row per purchase** — on its actual purchase date
  - **Closing balance** — last day of month (31 May, 28 Feb, 30 Apr etc.)
- Month dividers removed — rows flow continuously

### 6.2 Charge Item
- Hardcoded `2211002` in monthly report only
- Configurable via Settings → Reports → Charge Item Code

### 6.3 Responsible Officer
- Added to Settings → Reports & Exports
- Populated from `getSettings().responsibleOfficer`
- Appears in both CSV and Excel exports

### 6.4 Excel Formulas
Monthly report Excel now contains real working formulas:
- Column D (Opening Cost) = `=B×C`
- Column F (Cost of Additions) = `=E×C`
- Column H after additions = `=H(prev)+E`
- Column H closing = `=H(prev)−G`

### 6.5 Print Button
- Added `Print` button to Monthly Report page
- `@media print` CSS hides sidebar and navigation
- Report prints cleanly as a standalone document

### 6.6 Excel Corrupt File Fix
**Problem:** Downloaded Excel said "file is corrupt" and could not open.

**Root cause:** `wb.xlsx.write(res)` streams directly to HTTP response — Express middleware injected extra bytes mid-stream.

**Fix:** Changed to `wb.xlsx.writeBuffer()` then `res.end(buffer)` with `Content-Length` header set. Excel always opens correctly now.

---

## 7. Item Catalog Improvements

### 7.1 Duplicate Detection
- As user types a new item name, similar existing items are shown in an amber warning box
- Uses substring matching (detects partial matches)
- Shows up to 3 similar items with their units

### 7.2 UPPERCASE Enforcement
- All item descriptions saved in UPPERCASE automatically on create and edit

### 7.3 Unit Dropdown with Auto-Add
- Unit field shows dropdown of all existing units + base canonical list
- Deduplicated: removed PC, PCS, PKT etc. — replaced with PIECE, PACKET, KILOGRAM etc.
- Typing a new unit shows "+ Add new unit: XYZ" option

### 7.4 Low Stock Threshold Per Item
- Added `Alert At` field to each item in catalog
- Each item can have its own threshold (e.g. cotton wool alerts at 50, syringes at 5)
- Overrides the system-wide default threshold from Settings
- Shown as a column in the catalog table

---

## 8. Issue Voucher — Per-Item Folio Number

**Change:** Removed the single global Folio No field from the voucher header.

Each commodity row in the voucher now has its own `Folio No` field — different items in one voucher can have different folio numbers. S11 number remains shared across the whole voucher.

**Backend:** `POST /api/issues/voucher` now validates `it.folioNo` per item and stores it individually.

---

## 9. Department Section — Tue/Fri Grid

Clicking a department now shows two tabs:

**Tab 1: Issue Grid (Tue/Fri)**
- Matrix table: items as rows, every Tuesday and Friday in selected date range as columns
- Shows quantity issued on each date
- Tuesdays highlighted in blue, Fridays in purple
- Non-scheduled days that had issues shown with orange background
- Date range picker to choose any period

**Tab 2: Inventory Summary**
- Opening balance, KEMSA receipts, MEDS receipts, items issued, closing balance

---

## 10. All-Departments Excel Export

- Green **"All Depts Excel"** button in department detail page
- One Excel file with one sheet per department
- Each sheet contains per-month blocks with columns:
  - Item | Unit | Opening | KEMSA | MEDS | [All issue dates for that month] | Total Issued | Balance
- Issue date columns include all Tuesdays, Fridays, AND any other day that had an issue
- Color-coded by weekday: TUE=blue, FRI=purple, MON=green, WED=yellow, THU=orange, SAT=pink
- Non-scheduled issue days get an orange background to flag as emergency issues
- Balance column: green=healthy, amber=low, red=out of stock
- Summary sheet at end with totals for all departments

**Endpoint:** `GET /api/export/all-departments.xlsx?startMonth=YYYY-MM&endMonth=YYYY-MM`

---

## 11. Low Stock Alert Fixes

**Root cause of count mismatch (e.g. 107 vs 0):**
- Old code: calculated balance per-department (physical count + dept receipts − dept issues)
- Adding stock via Purchases (global) did not clear per-dept balance
- Summary counted per-dept × all departments = inflated number

**Fix:** Both the summary count and the low-stock panel now use `getCurrentStockForItem(itemId)` — global stock across all departments:
```
stock = item.quantity + all_purchases - all_issues
```

**Endpoint:** `GET /api/dashboard/low-stock` — returns deduplicated list, one entry per item, sorted by balance ascending.

---

## 12. Inactivity Auto-Logout

- After configurable period of no activity (default: 1 minute), user is logged out automatically
- 10 seconds before logout, amber warning banner slides in from bottom-right
- Any mouse movement, click, scroll, or keypress resets the timer
- Timeout and warning duration configurable in Settings → Session & Security

**Hook:** `useInactivityLogout` in `frontend/src/lib/use-inactivity-logout.tsx`  
**Events monitored:** `mousemove`, `mousedown`, `keydown`, `touchstart`, `scroll`, `click`, `wheel`, `pointermove`

---

## 13. Admin Settings Page

**Location:** Settings (admin only, in sidebar)

### Sections:

#### Facility Identity
- Hospital / Facility Name
- Facility Code (e.g. 14085)
- County (e.g. Nyeri)
- Sub-County (e.g. Mukurweini)
- Financial Year (e.g. 2025/2026)

#### Session & Security
- Inactivity Timeout (minutes) — controls auto-logout timer
- Warning Before Logout (seconds)
- Session Duration (days)
- Max Failed Login Attempts

#### Stock & Alerts
- Default Low Stock Threshold (system-wide, overridden per-item)
- Enable Email Alerts toggle
- Alert Email Address

#### Issue Rules
- Scheduled Issue Days (toggle Mon–Sun)
- Allow Issues on Non-Scheduled Days toggle
- Require Folio Number Per Item toggle
- Require S11 Number Per Voucher toggle
- Max Issue Quantity Per Item (0 = no limit)

#### Purchases
- Default Currency (KES)
- Require Invoice Number toggle
- Require Supplier Name toggle

#### Reports & Exports
- Charge Item Code (default: 2211002)
- Responsible Officer Name
- Store Officer Title
- Reporting Officer Title
- Allow Data Exports toggle
- Include Zero-Stock Items in Exports toggle

#### Appearance
- Logo / Icon picker (10 icons with emoji preview)
- Color Theme picker (8 themes: Indigo, Blue, Green, Rose, Orange, Purple, Teal, Slate)

#### Backup & Restore
- Download full JSON backup of all data
- Restore from backup file (with confirmation warning)

**Endpoints:**
- `GET /api/settings` — admin only, full settings
- `PATCH /api/settings` — update settings
- `GET /api/settings/public` — public, returns hospitalName, inactivityTimeoutMinutes, appTheme, appLogo

---

## 14. Excel Exports — Monthly Report & All Departments

### Monthly Report Excel
- One sheet per commodity
- Sheet name = commodity description (truncated to 28 chars)
- Colorful header per sheet using rotating color palette
- Opening rows: blue background
- Additions rows: green background
- Closing rows: grey background
- Real Excel formulas for cost calculations
- Responsible Officer column populated from Settings

### All-Departments Excel (see Section 10)

**Note on `exceljs`:** Must be in `backend/package.json` dependencies or Railway will not install it:
```json
"exceljs": "^4.4.0"
```

---

## 15. Purchases Page Upgrade

### New Features:
- **DateRangePicker** replacing MonthPicker
- **Batch Number** field — track batch/lot numbers for each purchase
- **Expiry Date** field — with color warnings:
  - Red badge: EXPIRED
  - Amber badge: "Exp in Nd" (expiring within 90 days)
  - Green badge: expiry date shown
- **Search bar** — filter by supplier, item, or invoice number
- **Running total** — shows total value of displayed purchases in KES
- **CSV Export** button — downloads filtered purchases
- **Excel Export** button — colorful spreadsheet with grand total row
- Live total preview when entering quantity × unit price in add form

**New endpoints:**
- `GET /api/export/purchases.csv?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/export/purchases.xlsx?from=YYYY-MM-DD&to=YYYY-MM-DD`

---

## 16. Stock Valuation Report

**Location:** Stock Valuation (in sidebar, visible to users with viewReports permission)

### Features:
- **Date picker** — "Calculate stock as at" any past date
- **Generate Report** button — recalculates historical stock for chosen date
- **Reset to Today** button
- 4 summary cards: Total Stock Value | OK Items | Low Stock | Out of Stock
- Filter buttons: ALL / OK / LOW / OUT
- Search by item name or supplier
- Filtered total updates dynamically
- Color-coded status column in table

### Table columns:
`#` | Item Description | Unit | In Stock | Unit Price | Total Value | Last Purchase | Supplier | Status

### Calculation:
```
stock_as_at_date = item.quantity + purchases_up_to_date - issues_up_to_date
total_value = stock * latest_unit_price_up_to_date
```

**Endpoints:**
- `GET /api/reports/stock-valuation?asAt=YYYY-MM-DD`
- `GET /api/export/stock-valuation.xlsx?asAt=YYYY-MM-DD`

---

## 17. Backup & Restore

**Location:** Settings → Backup & Restore

### Backup
- Downloads full `store.json` data as a JSON file
- Filename: `storemonitor_backup_YYYY-MM-DD.json`
- Contains all collections: users, departments, items, purchases, issues, receipts, inventory, settings

### Restore
- Upload a backup JSON file
- Validates required collections before applying
- Confirmation dialog warns that ALL current data will be replaced
- Page auto-reloads after successful restore
- Logged in activity log

**Endpoints:**
- `GET /api/admin/backup`
- `POST /api/admin/restore`

---

## 18. Animated Login Page

### Animations:
- **Particle network** — 60 floating dots connected by lines on a dark gradient background
- **Glowing orbs** — 3 soft colored blobs floating behind the card
- **Glass card** — frosted glass with `backdrop-filter: blur(20px)`
- **Animated logo** — chosen emoji floats up/down with two pulse rings
- **Shimmer text** — hospital name has moving light shimmer
- **ECG/heartbeat line** — animated SVG line draws itself continuously
- **Shake on error** — card shakes left-right on wrong password
- **Input glow on focus** — purple glow when typing
- **Button glow on hover** — sign-in button lifts and glows
- **Slide-up entrance** — card slides up and fades in on load
- **Show/hide password** — eye icon toggle

---

## 19. Appearance — Logo & Theme Picker

**Location:** Settings → Appearance

### Logo Options (10):
| Emoji | Name |
|-------|------|
| 🏥 | Hospital Building |
| ❤️ | Heart |
| 🛡️ | Shield |
| ⭐ | Star |
| ➕ | Medical Cross |
| 🩺 | Stethoscope |
| 🏨 | H Symbol |
| 💊 | Pill |
| 📈 | Activity |
| 🌿 | Leaf |

### Color Themes (8):
| Theme | Primary Color |
|-------|---------------|
| Indigo (default) | #6366f1 |
| Blue | #3b82f6 |
| Green | #16a34a |
| Rose | #e11d48 |
| Orange | #ea580c |
| Purple | #9333ea |
| Teal | #0d9488 |
| Slate | #475569 |

- Changes apply instantly on click (preview before saving)
- Saved to server — applies for all users on all devices
- Stored in `localStorage` for instant load on next visit

---

## 20. Hosting Discussion

### Current: Railway ($5/month after trial)
- Node.js supported ✅
- Persistent volume for `store.json` ✅
- Auto-deploy from GitHub ✅

### Free Alternative: Render + Vercel
- **Render.com** — hosts Node.js backend for free (sleeps after 15 min idle, wakes on request)
- **Vercel** — hosts React frontend for free (no sleep, fast CDN)
- No code changes needed — same `server.js`, same GitHub repo
- Migration planned when Railway trial ends

### Database Discussion: Supabase vs Firebase
- **Recommended: Supabase** — PostgreSQL matches relational data model (items → issues → departments)
- Firebase Firestore is NoSQL — fights against the app's relational structure
- Supabase already connected as MCP — migration can be done in one session
- **Decision:** Stay with `store.json` + Railway for now; migrate later when needed

---

## 21. Full File Reference

### Backend (`backend/`)
| File | Purpose |
|------|---------|
| `server.js` | Main Express server — all API endpoints |
| `package.json` | Dependencies including `exceljs` |
| `store.json` | LowDB JSON database |

### Frontend (`frontend/src/`)

#### Pages
| File | Purpose |
|------|---------|
| `pages/login.tsx` | Animated login page |
| `pages/dashboard.tsx` | Main dashboard with charts, live clock, low stock |
| `pages/departments.tsx` | Department list |
| `pages/department-detail.tsx` | Tue/Fri issue grid + inventory summary |
| `pages/items.tsx` | Item catalog with duplicate detection, threshold |
| `pages/purchases.tsx` | Purchases log with batch/expiry, exports |
| `pages/issues.tsx` | Issue voucher with per-item folio search |
| `pages/reports.tsx` | Monthly report with print button |
| `pages/exports.tsx` | CSV/Excel download center |
| `pages/stock-valuation.tsx` | Stock valuation as-at-date report |
| `pages/settings.tsx` | Admin settings — all system configuration |
| `pages/user-management.tsx` | User accounts management |

#### Components
| File | Purpose |
|------|---------|
| `components/layout.tsx` | Sidebar, nav, dark mode toggle, dynamic logo |
| `components/date-range-picker.tsx` | From/To date inputs (dark mode aware) |

#### Lib
| File | Purpose |
|------|---------|
| `lib/theme-context.tsx` | Dark mode, color theme, logo state |
| `lib/auth-context.tsx` | Login/logout/session state |
| `lib/use-inactivity-logout.tsx` | Auto-logout hook |
| `lib/api.ts` | Generated API hooks |

---

## Key API Endpoints Reference

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/auth/login` | public | Login |
| GET | `/api/auth/me` | any | Current user |
| GET | `/api/dashboard/summary` | viewDashboard | Stats |
| GET | `/api/dashboard/low-stock` | viewDashboard | Low stock items |
| GET | `/api/items/stock` | any | Items with balances |
| POST | `/api/issues/voucher` | issueItems | Create issue voucher |
| GET | `/api/reports/monthly` | viewReports | Monthly report data |
| GET | `/api/reports/stock-valuation` | viewReports | Stock valuation |
| GET | `/api/export/purchases.csv` | exportData | Purchases CSV |
| GET | `/api/export/purchases.xlsx` | exportData | Purchases Excel |
| GET | `/api/export/monthly-report.csv` | exportData | Monthly report CSV |
| GET | `/api/export/monthly-report.xlsx` | exportData | Monthly report Excel |
| GET | `/api/export/all-departments.xlsx` | exportData | All depts Excel |
| GET | `/api/export/stock-valuation.xlsx` | exportData | Valuation Excel |
| GET | `/api/settings` | manageUsers | Full settings |
| PATCH | `/api/settings` | manageUsers | Update settings |
| GET | `/api/settings/public` | public | Public settings |
| GET | `/api/admin/backup` | manageUsers | Download backup |
| POST | `/api/admin/restore` | manageUsers | Restore backup |

---

*Document generated: May 2026*  
*Mukurweini Hospital Stores App — Built with Claude*
