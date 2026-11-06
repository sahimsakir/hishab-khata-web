# HishabKhata Web

React 19 + TypeScript + Vite frontend for [HishabKhata API](https://github.com/sahimsakir/hishab-khata-api).

**Every paisa, accounted for.**

## Features

- Email/password registration and login; Google registration/login and deliberate account linking.
- Personal dashboard, accounts, opening balances, transfers, and exact ৳0.10 tracking.
- Salary, business profit, freelance, rental, and other recurring income.
- Bank/personal/car/home/business/credit-card EMI loans with monthly payments, principal, interest, and balances.
- Credit card purchases, active statement, minimum dues, due dates, repayments.
- DPS/FDR/SIP/goals, contributions, withdrawals, maturity dates.
- Monthly bills, overdue commitments, partial payments, recurring category budgets.
- Daily/monthly/yearly ledger and reports, cash flow, net worth, CSV exports.
- Responsive navigation and loading/error states. All records belong to the signed-in user's backend workspace.

## Local setup

Requires Node.js 22+ and npm. Set up and start the [Laravel API](https://github.com/sahimsakir/hishab-khata-api) first on `http://localhost:8000`.

```bash
cp .env.example .env
npm ci
npm run dev
```

Open `http://localhost:5173`. The frontend runs outside Docker. Vite proxies `/api` to Laravel on port 8000. Use `localhost` consistently, rather than mixing it with `127.0.0.1`.

Default `.env`:

```dotenv
VITE_API_BASE_URL=
VITE_GOOGLE_AUTH_URL=http://localhost:8000/api/auth/google/redirect
VITE_GOOGLE_LINK_URL=http://localhost:8000/api/auth/google/link
```

Do not put client secrets or Passport tokens here. Every `VITE_` value is included in the public browser bundle.

Register, add an account with an opening balance, then add income, loans, cards, and savings. Use **Monthly planner → Receive / Record payment** to connect transactions to their scheduled month. Generic transaction entry supports extra or unscheduled payments.

For Google sign-in, configure OAuth credentials in the backend only. Google must be configured to permit public registration; its testing mode may limit sign-in to test users. See the API README for the exact callback URI and account-linking behavior.

## Authentication

`src/api.ts` uses `credentials: include` and obtains a session CSRF value from Laravel. It sends `X-CSRF-TOKEN` for writes. Laravel issues encrypted **HttpOnly Passport cookies**, so React never reads or stores the access token. No raw token is placed in localStorage, sessionStorage, callback URLs, or React state. Logout revokes the token. The 12-hour cookie/token expiry requires sign-in again.

## Project organization

- `src/Auth.tsx`: auth context, email registration/login, Google callback.
- `src/api.ts`: cookie/CSRF-aware API client.
- `src/App.tsx`: routes, dashboard, ledger, income, loans, cards, planner, savings, accounts, budgets, reports.
- `src/Editors.tsx`: typed record and transaction forms.
- `src/forms.ts`: field schemas and descriptions.
- `src/types.ts`: API contracts.
- `src/money.ts`: exact decimal-string/paisa helpers.

Amounts are submitted as decimal strings; returned `_paisa` fields are integer paisa. Calculations and validation are authoritative on the API. A credit card repayment is not another expense, and loan principal and interest are kept separate.

Account/loan/card/savings pages show current totals. Reports show the selected reporting period; income expectations, budgets, and the monthly planner use the selected date's month. Saved values require the backend; there is no localStorage-only financial workspace.

## Production build

```bash
npm run build
```

Serve `dist/` with SPA fallback to `index.html`. Example build-time environment for same-site subdomains:

```dotenv
VITE_API_BASE_URL=https://api.example.com
VITE_GOOGLE_AUTH_URL=https://api.example.com/api/auth/google/redirect
VITE_GOOGLE_LINK_URL=https://api.example.com/api/auth/google/link
```

The API's `FRONTEND_URL` must exactly match this frontend's origin, allow credentialed CORS, and use secure cookies over HTTPS. Set the production Google callback in both Laravel and Google Console. Unrelated cross-site app/API domains are not supported by the supplied SameSite=Lax arrangement.

## Verification

```bash
npm test
npm run build
```

Four money tests and the TypeScript/Vite production build passed during preparation. No browser-level React journey or production deployment was performed. Live Google sign-in requires your own credentials. This tool records finances; it does not execute payments or connect to a bank. CSV exports contain selected-period transactions and are not a full database backup.
