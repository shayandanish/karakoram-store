# Karakoram Store

A Pakistan-focused artisan storefront for products from Hunza and Gilgit-Baltistan. The app includes a React storefront, an Express API, MongoDB persistence, Firebase-backed authentication, manual Easypaisa checkout, order tracking, and an admin workspace.

## Repository

- `client/` — React 19, Vite, Tailwind CSS, Vitest, and Playwright.
- `server/` — Express 5 API, Mongoose models, Vitest tests, and optional Redis caching.

## Requirements

- Node.js 24 (the CI runtime; Vite 8 requires a recent Node 20+ release).
- MongoDB for local API and storefront use.
- Optional: Firebase, Cloudinary, Resend/SMTP, and Redis. See `server/.env.example` for configuration.

## Local development

1. Configure the API:

   ```sh
   cd server
   npm ci
   cp .env.example .env
   ```

   Set `MONGODB_URI`, a strong `JWT_SECRET`, and any integrations you plan to use. Start the API with `npm run dev` (port 5000).

2. Configure and start the storefront in a second terminal:

   ```sh
   cd client
   npm ci
   cp .env.example .env
   npm run dev
   ```

   Vite serves the app at `http://localhost:5173`. Set `VITE_API_URL` only when the API is not at `http://localhost:5000/api`.

3. Optional seed scripts are available in `server/`: `npm run seed` and `npm run seed:admin`. Set the corresponding seed credentials in the local environment first.

## Shipped storefront and admin capabilities

- Product catalog, categories, regions, product details, local cart, and responsive image delivery.
- Guest checkout and Firebase/JWT-backed customer accounts.
- Easypaisa orders with transaction details, payment-proof upload, order tracking, and status notifications.
- Admin product, category, city, artisan, coupon, order, and store-settings management.
- Admin overview with paid-revenue periods, pending-order and inventory alerts, customer order summaries, and coupon redemption results.
- Admin-only Accounts workspace for supplier purchases, inventory cost, expenses, audit logs, profit reports, and formula-bearing Excel exports.
- Product ratings/reviews and optional Redis caching.

Shipping rates and public payment/contact details are managed in **Admin → Settings**. Customer WhatsApp order notifications are disabled by default.

## Admin daily workflow

1. Start at **Admin → Dashboard** to review paid revenue, orders awaiting action, recent purchases, and active products with low stock. Select a revenue period to inspect all-time, 30-day, or 7-day totals; selecting the metric opens the corresponding paid-order list.
2. In **Admin → Orders**, search by order ID, customer name/email/phone, transaction reference, courier, or tracking number. Combine order/payment status, payment method, and date filters. Open an order to review proof, update its status, add courier details, or inspect the audit trail.
3. Use **Admin → Products** stock filters to find low-stock, out-of-stock, and available products. Featured and seasonal flags are visible in the catalog list.
4. **Admin → Users** shows each account’s order count, paid total, and latest order date; use **View orders** to open that customer’s order list.
5. **Admin → Coupons** reports redemptions found in orders and the total discount granted. The usage counter remains the coupon’s configured redemption-limit tracker.
6. In **Admin → Store Settings**, use the section shortcuts to edit store details or checkout payment methods. A failed settings load disables edits so fallback defaults cannot accidentally overwrite saved settings.
7. In **Admin → Accounts**, add suppliers, record opening stock and purchases, record supplier payments and expenses, and review product profit by day/week/month/custom period. Download a native Excel workbook (`.xlsx`) with summary, transaction, product, purchase, and supplier-payment sheets, including formulas.

All `/api/admin` routes require a valid authenticated administrator. Accounts endpoints additionally require a recent TOTP MFA sign-in in production, reject untrusted browser origins, are rate-limited, and return no-store responses. In Firebase Console, enable TOTP multi-factor authentication for the project and enroll each administrator with an authenticator app before production use. Accounts enrollment and sign-in challenge are available in the admin UI. Keep admin credentials private and use HTTPS in production.

Accounts stores costs in integer paisa, snapshots weighted-average inventory cost when an order is placed, and prevents product forms/bulk actions from changing stock outside the audited purchase workflow. Purchase, expense, supplier-payment, and reversal records are append-only; supplier/expense corrections should be made through new audited records. A purchase can be reversed only while inventory still matches its post-purchase stock and cost snapshot, and after any later supplier payments have been reversed; purchases paid at creation cannot be reversed. Otherwise, record a corrective stock adjustment. Historical orders without cost snapshots are not assigned estimated costs and are excluded from profit. Refunds, cancelled/returned paid orders, shipping income, and inventory purchases have separate report treatment; paid cancelled/returned orders are flagged for reconciliation. These reports are operational estimates, not formal accounting or tax statements.

## Checks

```sh
# Run from client/
npm run lint
npm run test:run
npm run build

# Run from server/
npm run test:run
```

Playwright tests need a running API, MongoDB, and suitable test data. CI skips E2E by default; set the repository Actions variable `RUN_E2E` to `true` only after configuring the `E2E_MONGODB_URI` and `E2E_JWT_SECRET` Actions secrets and pre-seeding that test database.

## Deployment

Deploy `client/` and `server/` as separate Vercel projects, with each directory set as its project's root. Configure production values from `server/.env.example` in the API project, including `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, Firebase credentials, and Cloudinary credentials for image uploads. Set `VITE_API_URL` and the public Firebase settings in the client project. Both projects must use HTTPS for cross-origin auth cookies.

The GitHub workflow builds the client on pushes and pull requests. Client deployment from `main` is opt-in: set the Actions variable `DEPLOY_VERCEL` to `true` after configuring the `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` secrets. Deploy the backend Vercel project separately. Vercel's filesystem is ephemeral, so production uploads require Cloudinary.

The backend payment-reminder cron runs daily at 00:00 UTC to comply with Vercel Hobby's once-per-day cron limit. More frequent runs require a Vercel plan that supports them.

## Secrets

Never commit `.env` files, production credentials, or database backups. `server/.env.atlas-backup` is intentionally ignored; rotate any credentials that may have been shared or exposed.
