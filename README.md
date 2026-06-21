# Qbits Vault — Frontend

**React 19 + Vite** SPA for a vault/cash management system. Backend API lives at `D:\projects\qbits-vault-api` (Laravel 12).

---

## Quick Start

```bash
cp .env.example .env   # set VITE_REACT_APP_API_BASE_URL and VITE_REACT_APP_STORAGE_URL
npm install
npm run dev            # http://localhost:5173
```

**Env vars:**
| Variable | Example |
|---|---|
| `VITE_REACT_APP_API_BASE_URL` | `http://qbits-vault-api.test/api` |
| `VITE_REACT_APP_STORAGE_URL` | `http://qbits-vault-api.test/storage` |

---

## Tech Stack

| Concern | Library |
|---|---|
| Framework | React 19, Vite 7 |
| Routing | React Router v6 |
| Global state | Redux Toolkit + redux-persist (localStorage) |
| Server state | TanStack Query v5 (5-min stale, no refetch-on-focus) |
| Styling | Tailwind CSS v4 + tailwind-merge + clsx |
| Forms | React Hook Form |
| HTTP | Axios with custom interceptors (`src/utils/axiosConfig.js`) |
| Charts | Recharts |
| Animations | Framer Motion |
| Notifications | React Hot Toast + `useToast()` hook |
| Icons | Lucide React, React Icons |
| QR/Barcode | react-qr-code, jsbarcode, @zxing/library |
| Printing | react-to-print |
| Dates | dayjs |
| Geolocation | bd-geo-location |

No pre-built component library (no shadcn/MUI) — all UI components are custom-built under `src/components/global/`.

---

## Project Structure

```
src/
├── main.jsx              # Entry: Redux Provider > PersistGate > QueryClient > App
├── App.jsx               # Imports routes
├── routes/Index.jsx      # All route definitions
│
├── components/
│   ├── global/           # Reusable UI: Button, Input, Select, Checkbox, DataTable,
│   │                     #   Modal, Drawer, Search, Toast, Tooltip, Can, PermissionButton
│   ├── layout/           # Layout.jsx, sidebar/, topbar/, dashboard/
│   ├── cashin/           # orderDetailsDrawer/
│   ├── cashout/          # bagDetailsDrawer.jsx
│   ├── reconcile/
│   ├── vaults/
│   ├── user/
│   ├── settings/vaultAudit/
│   ├── permission/       # PermissionInitializer.jsx
│   ├── permissionRoute/  # Route-level permission guard
│   └── privateRoute/     # Auth guard
│
├── pages/                # login, cashin, cashout, vault, users, reconcile,
│                         # reports, profile, activityLog, systemPreferences, settings/vaultAudit
│
├── store/
│   ├── index.jsx         # Store setup
│   ├── authSlice.jsx     # user, roles, permissions, token — persisted
│   └── checkReconcile.jsx
│
├── services/             # Axios API calls per domain:
│                         # Auth, Cash, Dashboard, Ledger, Orders, Permission,
│                         # Reconcile, Reports, Role, User, Vault, VaultAudit
│
├── hooks/
│   ├── usePermissions.js
│   └── useToast.js
│
└── utils/
    ├── axiosConfig.js    # Auth headers, token refresh, error handling
    └── cn.js             # classnames helper
```

---

## Routes & Permissions

All routes under `/` require auth via `<PrivateRoute>`. Most also require a named permission via `<PermissionRoute>`.

| Path | Permission |
|---|---|
| `/` | (dashboard — open to auth users) |
| `/users` | `user.view` |
| `/vault` | `vault.view` |
| `/cashin` | `cash-in.view` |
| `/cashout` | `cash-out.view` |
| `/reconcile` | `reconciliation.view` |
| `/reports` | `report.view` |
| `/profile` | (open to auth users) |
| `/settings/activity-log` | `setting.log` |
| `/settings/config-vault-audit` | `setting.config_audit_view` |
| `/settings/system-preferences` | `setting.default_view` |
| `/login` | public |
| `/reset-password` | public |

---

## Auth & Permission System

- **Token** stored in Redux + persisted to localStorage via redux-persist.
- **Roles & permissions** fetched on login via async thunks (`fetchAuthUser`, `fetchUserPermissions`) and stored in `authSlice`.
- **Super Admin bypass:** Super Admins skip all permission checks (handled in `selectIsSuperAdmin` selector and sidebar/route guards).
- **`<Can permission="x.y">`** wraps any UI element to show/hide based on permissions.
- **`<PermissionRoute>`** redirects to 404 if the user lacks the required permission.
- **`usePermissions()`** hook for imperative permission checks in components.

---

## Key Features

- **Cash-In / Cash-Out** — order/bag lifecycle management with drawer UI
- **Vault Management** — vault CRUD, audit config
- **Reconciliation** — balance matching with global state (`checkReconcile` slice)
  > **Note:** The reconcile module no longer uses `reconcile_required_verifiers`. Use **`reconcile_required_reconcilers`** instead (frontend reads the `required_reconcilers` field). `required_verifiers` remains in use only for Cash-In / Cash-Out.
- **Reports** — charts (Recharts), export/print support
- **User Management** — CRUD, role assignment
- **KYC / Verification** — user verification workflow with QR/barcode scanning
- **Activity Log & System Preferences** — under settings
- **Role-Based Access Control** — granular per-route and per-component permission gating

---

## API Backend

- **Location:** `D:\projects\qbits-vault-api` (Laravel 12)
- **Local URL:** `http://qbits-vault-api.test` (Laravel Herd/Valet)
- Run `php artisan storage:link` on the API side for file access.
