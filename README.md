# Hunzora

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-47A248?logo=mongodb&logoColor=white)](https://mongoosejs.com)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)

A Pakistan-focused artisan storefront for dry fruits, raw honey, cold-pressed oils, herbs,
handmade crafts, and gifts from Hunza and Gilgit-Baltistan. Hunzora combines a modern React
storefront with an Express API, MongoDB persistence, Firebase-backed authentication, manual
Easypaisa/JazzCash/bank-transfer checkout, order tracking, and a full admin workspace with
inventory and accounts management.

---

## Table of contents

1. [What is included](#what-is-included)
2. [Tech stack](#tech-stack)
3. [Repository layout](#repository-layout)
4. [Requirements](#requirements)
5. [Quick start (local development)](#quick-start-local-development)
6. [Environment variables](#environment-variables)
7. [For customers — using the storefront](#for-customers--using-the-storefront)
8. [For admins — using the admin workspace](#for-admins--using-the-admin-workspace)
9. [Managing stock and inventory](#managing-stock-and-inventory)
10. [Managing accounts and finance](#managing-accounts-and-finance)
11. [Admin roles and permissions](#admin-roles-and-permissions)
12. [API overview](#api-overview)
13. [Available scripts](#available-scripts)
14. [Testing](#testing)
15. [Troubleshooting & FAQ](#troubleshooting--faq)
16. [Deployment](#deployment)
17. [Secrets and security](#secrets-and-security)
18. [Contributing](#contributing)

---

## What is included

### Storefront

- Responsive home page with featured and seasonal products, region highlights, and trust badges.
- Shop page with search, category/region/price/availability filters, sorting, pagination, and a
  centered three-area header with compact mobile navigation.
- Product detail pages with image gallery, selectable variants, stock status, ratings/reviews,
  and related products.
- Local shopping cart and wishlist (persisted in the browser).
- Guest checkout and account checkout with shipping address, delivery-zone pricing, coupon
  codes, payment-method selection, and payment-proof upload.
- Manual payment flow for Easypaisa, JazzCash, bank transfer, and cash on delivery, plus a
  point-of-sale (POS) checkout for walk-in/admin orders.
- Order success page, customer order history, and public order tracking by order ID.
- Customer accounts with email/password or Firebase/Google sign-in.
- Contact form, About page, WhatsApp order links, and floating WhatsApp support button.

### Admin workspace

- Dashboard with revenue periods (all-time / 30-day / 7-day), sales chart, average order value,
  new customers, top products, and an attention queue.
- Order management: search, filter, status updates, courier/tracking details, payment-proof
  review, notification log, and audit trail.
- Product, category, artisan, city/region, and coupon management.
- Inventory overview, stock adjustments, reorder alerts, and stock-movement history.
- Accounts workspace for suppliers, inventory purchases, supplier payments, expenses, profit
  reports, audit logs, and formula-bearing Excel exports.
- Customer account management and staff account management with role-based permissions.
- Store settings for branding, payment methods, shipping zones, contact details, and
  customer-notification toggles.
- Cross-area activity log for admin and staff changes.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 8, React Router 7, TanStack Query 5, Tailwind CSS 4 |
| Backend | Node.js, Express 5, Mongoose 9 |
| Database | MongoDB (Atlas or local) |
| Auth | Firebase Authentication + JWT cookies, bcrypt for seeded admins/staff |
| Media | Cloudinary (with multer fallback for local uploads) |
| Email | Resend (primary), Nodemailer/SMTP (fallback), Ethereal in development |
| Caching | Optional Redis; falls back to in-memory caching |
| Messaging | Optional WhatsApp Cloud API |
| Testing | Vitest (client + server), Playwright (E2E) |
| Linting | oxlint |

---

## Repository layout

```text
Hunzora/
├── client/                  # React storefront and admin dashboard
│   ├── src/
│   │   ├── components/      # Layout, UI, and admin components
│   │   ├── context/         # Auth, cart, wishlist, toast providers
│   │   ├── hooks/           # Shared hooks (site settings)
│   │   ├── lib/             # Axios, cart, payment, region, and admin helpers
│   │   └── pages/           # Storefront pages + pages/admin/*
│   ├── .env.example         # Client environment template
│   └── README.md            # Frontend-specific notes
├── server/                  # Express API
│   ├── api/                 # API index/router composition
│   ├── config/              # Database, Firebase, email, cache configuration
│   ├── controllers/         # Route handlers
│   ├── middlewares/         # Auth, uploads, audit, security
│   ├── models/              # Mongoose models
│   ├── routes/              # Express routers
│   ├── services/            # Email, WhatsApp, notification services
│   ├── tests/               # Vitest API tests
│   ├── utils/               # Money, reports, caching, rate limits
│   ├── seed.js              # Sample catalog seed
│   ├── seedAdmin.js         # Admin account seed
│   └── .env.example         # Server environment template
├── package.json             # Monorepo convenience scripts
└── README.md                # This file
```

---

## Requirements

- **Node.js ≥18** for the root scripts; CI runs Node 24, and Vite 8 needs a recent Node 20+ release.
- **MongoDB** — Atlas connection string or a local `mongod` instance.
- Optional integrations:
  - **Firebase** — customer email/Google sign-in, email verification, and Accounts MFA.
  - **Cloudinary** — production image uploads (Vercel's filesystem is ephemeral).
  - **Resend or SMTP** — transactional email.
  - **Redis** — shared cache across API instances.
  - **WhatsApp Cloud API** — automated customer WhatsApp updates.

---

## Quick start (local development)

### 1. Install dependencies

From the repository root:

```sh
npm run install:all
```

This installs the root, server, and client dependencies. You can also run `npm install` inside
`server/` and `client/` separately.

### 2. Configure the API

```sh
cd server
cp .env.example .env
```

Open `server/.env` and set at minimum:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=a_long_random_secret_at_least_32_chars
CLIENT_URL=http://localhost:5173
```

Add Firebase, Cloudinary, Resend/SMTP, Redis, or WhatsApp values only for the integrations you
plan to use. Start the API:

```sh
npm run dev
```

The API runs at `http://localhost:5000` (configurable with `PORT`).

### 3. Configure and start the storefront

In a second terminal:

```sh
cd client
cp .env.example .env
npm run dev
```

The storefront runs at `http://localhost:5173`. The default `VITE_API_URL` is
`http://localhost:5000/api`; change it only when your API runs elsewhere.

### 4. Seed sample data (optional)

From `server/`:

```sh
npm run seed          # sample categories, products, and related data
npm run seed:admin    # create the initial administrator account
```

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `server/.env` **before** running `npm run seed:admin`.
Never commit those values.

### 5. Run both at once (optional)

From the repository root:

```sh
npm run dev
```

This starts the API and client together with `concurrently`.

---

## Environment variables

### Server (`server/.env`)

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | `development` or `production`. |
| `PORT` | API port (default `5000`). |
| `MONGODB_URI` | MongoDB connection string. **Required.** |
| `JWT_SECRET` | JWT signing secret (32+ random characters). **Required.** |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d`. |
| `CLIENT_URL` | Allowed CORS origin (the storefront URL). |
| `REDIS_URL` | Optional Redis connection; in-memory cache is used when unset. |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary image upload. |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Firebase Admin service account. |
| `RESEND_API_KEY` / `EMAIL_FROM` | Primary transactional email provider. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` | SMTP fallback (Ethereal in development). |
| `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_API_URL` / `WHATSAPP_API_VERSION` / `WHATSAPP_TEMPLATE_NAME` / `WHATSAPP_TEMPLATE_LANGUAGE` | Optional WhatsApp Cloud API. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Used only by `npm run seed:admin`. |
| `ACCOUNTS_REQUIRE_MFA` | Local override only. Production accounts always require recent Firebase TOTP MFA. |
| `CRON_SECRET` | Secret for the automated payment-reminder cron. |

### Client (`client/.env`)

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend API base URL (no trailing slash). |
| `API_BASE_URL` | Optional serverless/crawler API base; defaults to `VITE_API_URL`. |
| `SITE_URL` | Public site URL used for crawler previews. |
| `VITE_WHATSAPP_NUMBER` | WhatsApp business number for order links. |
| `VITE_CLOUDINARY_CLOUD_NAME` | Enables Cloudinary image optimisation. |
| `VITE_FIREBASE_API_KEY` / `VITE_FIREBASE_AUTH_DOMAIN` / `VITE_FIREBASE_PROJECT_ID` / `VITE_FIREBASE_APP_ID` | Public Firebase web-app identifiers (not secrets). |

---

## For customers — using the storefront

### Browse the catalog

1. Open the home page to see featured products, seasonal picks, regions, and store highlights.
2. Go to **Shop** to browse everything. Use the toolbar above the grid to:
   - Search by product name or description.
   - Filter by **Category**, **Region**, **Price**, and **Availability** (in stock / on sale).
   - Sort by newest, oldest, price, or rating.
   - Clear individual filters from the active-filter chips, or use **Clear all**.
3. Select a product to open its detail page, choose a variant (for example 250g or 500g), read
   reviews, and add it to the cart or wishlist.

### Place an order

1. Open the **Cart** and adjust quantities or remove items.
2. Continue to **Checkout**, sign in, or check out as a guest with name, email, phone, and
   shipping address.
3. Choose a payment method:
   - **Easypaisa / JazzCash / bank transfer** — the order is created with payment pending; follow
     the displayed account details and upload a payment-proof screenshot.
   - **Cash on delivery** — pay when the order arrives.
4. Apply a coupon code if you have one. Shipping is calculated from the configured delivery zone.
5. Submit the order. You will see an order confirmation with the order ID.

> Keep the order ID and use the same email/phone when contacting support. Order notifications
> are sent to the email address provided at checkout, so double-check it before submitting.

### Track an order

- Use **Track Order** and enter the order ID, or open **My Orders** after signing in.
- Each order shows its current status: pending, confirmed, processing, packed, shipped, out for
  delivery, delivered, cancelled, or returned.
- Once an admin adds courier details, the tracking number and tracking link appear on the order.

### Account and wishlist

- **Register** or **Sign in** with email/password or Google.
- **My Orders** lists past orders and their statuses.
- **Wishlist** saves products for later; items stay in the browser until you remove them.

### Contact support

- Use the **Contact** page to send a message.
- Use the WhatsApp button or the phone/email details in the footer for direct support.

---

## For admins — using the admin workspace

Sign in with an administrator account, then open `/admin`. All `/api/admin` routes require a
valid authenticated administrator, or an active staff account with the matching permission.

### Dashboard (`/admin`)

- Review the attention queue (orders or stock that need action).
- Switch revenue periods: all-time, last 30 days, or last 7 days.
- Inspect the sales chart, average order value, new customer accounts, and top products.
- Use attention links to jump to filtered orders or inventory lists.

### Orders (`/admin/orders`)

1. Search by order ID, customer name/email/phone, transaction reference, courier, or tracking
   number.
2. Combine order status, payment status, payment method, and date filters.
3. Open an order to:
   - Review payment proof and customer notes.
   - Update order status (pending → confirmed → processing → packed → shipped → out for
     delivery → delivered, or cancelled/returned).
   - Add courier name, tracking ID, tracking URL, and estimated delivery.
   - Review the status history, audit trail, and notification log.
   - Resend customer notifications when needed.

### Products (`/admin/products`)

- Create, edit, and archive products.
- Manage variants (label, price, stock, discount, compare-at price).
- Upload images, set a primary image, and add alt text/descriptions.
- Assign a category, artisan, and primary supplier.
- Set featured, seasonal, and active flags.
- Edit SEO title and description.
- Use bulk actions for common catalog updates.

> Product forms and bulk actions do **not** change stock outside the audited purchase workflow.
> Use **Inventory** or **Accounts → Purchases** for stock changes.

### Categories, artisans, cities, and coupons

- **Categories** (`/admin/categories`) — name, slug, group, icon, description, order, image.
- **Artisans** (`/admin/artisans`) — name, village, story, photo.
- **Cities/Regions** (`/admin/cities`) — name, slug, tagline, body, image, accent/gradient, order,
  and active flag.
- **Coupons** (`/admin/coupons`) — percentage or fixed discount, minimum order, expiry, total
  usage limit, and per-customer limit. The coupons page reports redemptions found in orders and
  the total discount granted.

### Customers (`/admin/users`)

- View customer accounts with order totals.
- Open a customer's order list.
- Verify or delete customer accounts.

### Staff (`/admin/staff`)

- Create staff accounts with a username and password.
- Assign a role: `orders_manager`, `catalog_manager`, `accounts_manager`, or `content_manager`.
- Activate/deactivate accounts and reset passwords.
- Only full administrators can manage staff, customers, and activity logs.

### Store settings (`/admin/settings`)

- Branding: store name, tagline, description, logo.
- Shipping: default fee, delivery min/max days, and delivery zones with per-zone fees.
- Payments: enable/disable Easypaisa, JazzCash, bank transfer, and cash on delivery, and edit
  account names, numbers, and instructions.
- Contact details: phone, email, WhatsApp number.
- Customer notification toggles for email and WhatsApp (WhatsApp is disabled by default).
- A failed settings load disables editing so fallback defaults cannot overwrite saved settings.

### Contact messages (`/admin/contact-messages`)

- Read customer inquiries, update their status, and send replies.

### Activity log (`/admin/activity`)

- Review cross-area admin and staff changes.
- Records field names and actions, not submitted values.

### Point of sale (`/admin/pos`)

- Create orders for walk-in customers.
- Select products/variants, quantities, payment method, and customer details.
- POS orders are marked with `source: pos` and follow the same stock and reporting rules.

---

## Managing stock and inventory

Stock is tracked per **product variant**, not per product. Each variant has its own `stock`,
`price`, discount, and cost snapshot.

### Where stock changes

| Action | Where | Effect |
|--------|-------|--------|
| Receive goods from a supplier | **Accounts → Purchases** | Increases variant stock and updates weighted-average cost. |
| Record opening stock | **Accounts → Purchases** (kind: opening stock) | Sets initial stock and cost once per variant. |
| Stock adjustment | **Inventory** | `goods_received`, `damage_loss`, `physical_count_correction`, or `internal_use`. |
| Customer order paid | Checkout / POS | Decrements variant stock and snapshots unit cost on the order. |
| Order cancelled/returned | **Orders** | Stock can be restored through the order-cancelled movement. |

### Inventory page (`/admin/inventory`)

- **Stock overview** — search by product or SKU; filter by category, supplier, and stock status
  (all, in stock, low stock, out of stock). KPI cards show total units, total variants, low-stock
  variants (1–5 units), and out-of-stock variants.
- **Adjust stock** — choose a product and variant, then:
  - `goods_received` — add units received.
  - `damage_loss` — deduct damaged units (cannot exceed available stock).
  - `internal_use` — deduct units used internally.
  - `physical_count_correction` — set the counted quantity (absolute mode).
  - Add a reason and optional reference for the audit trail.
- **Reorder alerts** — variants with 10 or fewer units are grouped by supplier with a recommended
  reorder quantity.
- **Stock movements** — a chronological, filterable history of every stock change, including the
  actor, reason, reference, and before/after quantities.

### Rules to keep inventory accurate

- Do not edit stock directly in the database.
- Do not try to change stock through the product form or bulk actions.
- Record purchases and adjustments with clear reasons and references.
- Reversals are append-only: create a corrective record instead of deleting history.
- A purchase can be reversed only while inventory still matches its post-purchase snapshot,
  after any later supplier payments have been reversed, and only when the purchase was not paid
  at creation. Otherwise, record a corrective stock adjustment.
- Historical orders without cost snapshots are excluded from profit calculations.

---

## Managing accounts and finance

The **Accounts** workspace (`/admin/accounts`) requires the `accounts` permission and is
restricted to trusted origins, rate-limited, and served with `no-store` responses.

### Suppliers

- Add suppliers with contact name, email, phone, address, and notes.
- See each supplier's product count, total purchased, total paid, and outstanding balance.
- Open a supplier statement for purchases, payments, and linked products.

### Purchases

- Record a purchase with supplier, reference, purchase date, due date, and notes.
- Add line items: product, variant, quantity, unit cost, and additional cost.
- Track payment status: unpaid, partial, or paid.
- Record supplier payments against a purchase; payments cannot exceed the remaining balance.
- Reverse purchases and supplier payments when they were recorded in error, with a reason.
- Opening stock entries can only be recorded once per variant.

### Expenses

- Record expenses with category, description, amount, date, payment method, and reference.
- Reverse an expense with a reason instead of deleting it.

### Profit reports

- Select day, week, month, or a custom period.
- Review summary totals and per-product sales, cost of goods sold, and gross profit.
- Products/orders without cost data are flagged rather than estimated.
- Refunds, cancelled/returned paid orders, shipping income, and inventory purchases have separate
  report treatment; paid cancelled/returned orders are flagged for reconciliation.

### Excel export

- Download a native `.xlsx` workbook with summary, transaction, product, purchase, and
  supplier-payment sheets.
- The workbook includes formulas and is generated from the same data as the on-screen report.
- Exports are audit-logged.

> Accounts costs are stored in integer paisa. These reports are operational estimates, not
> formal accounting or tax statements.

---

## Admin roles and permissions

Full administrators have every permission: `dashboard`, `orders`, `catalog`, `accounts`,
`content`, and `users`.

| Staff role | Permissions |
|------------|-------------|
| `orders_manager` | Dashboard, Orders, POS, Inventory |
| `catalog_manager` | Dashboard, Catalog, Inventory, Categories, Artisans, Cities, Coupons |
| `accounts_manager` | Dashboard, Accounts |
| `content_manager` | Dashboard, Store Settings, Contact Messages |

Notes:

- **Customers** and **Staff** management, plus the **Activity Log**, are administrator-only.
- Accounts endpoints require the `accounts` permission and, in production, recent Firebase TOTP
  MFA.
- Staff can be deactivated at any time; deactivation invalidates their active sessions.

---

## API overview

The API is served under `/api` (and `/app`, for compatibility with serverless deployments).
Health check: `GET /api/health`.

### Public endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/health` | Service health check. |
| `GET` | `/api/products` | List products. Supports `search`, `category`, `region`, `minPrice`, `maxPrice`, `inStock`, `sale`, `sort`, `page`, and `limit`. |
| `GET` | `/api/products/:slug` | Product detail. |
| `GET` | `/api/products/:slug/reviews` | Product reviews. |
| `POST` | `/api/products/:slug/reviews` | Submit a review (signed-in customers). |
| `GET` | `/api/categories` | List categories. |
| `GET` | `/api/categories/:slug` | Category detail. |
| `GET` | `/api/cities` | List cities/regions. |
| `GET` | `/api/cities/:slug` | City detail. |
| `GET` | `/api/settings` | Public store settings. |
| `POST` | `/api/contact` | Submit a contact message. |
| `POST` | `/api/orders` | Create an order (guest or signed in). |
| `GET` | `/api/orders/track` | Track an order by ID plus phone/email. |
| `POST` | `/api/orders/:id/payment-screenshot` | Upload payment proof. |
| `GET` | `/api/orders/my` | Signed-in customer's orders. |
| `GET` | `/api/orders/:id` | Single order (owner, admin, or with verification). |
| `POST` | `/api/auth/register` | OTP-based registration. |
| `POST` | `/api/auth/send-otp` | Send a registration OTP. |
| `POST` | `/api/auth/verify-otp` | Verify a registration OTP. |
| `POST` | `/api/auth/firebase-register` | Register with a Firebase token. |
| `POST` | `/api/auth/firebase-login` | Sign in with a Firebase token. |
| `POST` | `/api/auth/login` | Legacy admin password login. |
| `POST` | `/api/auth/staff-login` | Staff username/password login. |
| `GET` | `/api/auth/me` | Current session. |

### Admin endpoints

All admin endpoints live under `/api/admin` and require an authenticated administrator or an
active staff account with the relevant permission (`dashboard`, `orders`, `catalog`,
`accounts`, `content`, or `users`).

| Area | Endpoints |
|------|-----------|
| Dashboard | `GET /stats`, `GET /audit` (admin only) |
| Staff | `GET/POST /staff`, `PATCH /staff/:id/status`, `PATCH /staff/:id/role`, `PUT /staff/:id/password` (admin only) |
| Products | `GET/POST /products`, `GET/PUT/DELETE /products/:id`, `POST /products/bulk-update` |
| Inventory | `GET /inventory/stock`, `POST /inventory/adjust`, `GET /inventory/movements`, `GET /inventory/reorder-alerts` |
| Orders | `GET /orders`, `GET/PUT/DELETE /orders/:id`, `POST /orders/:id/resend-notification`, `POST /pos/checkout` |
| Categories | `POST /categories`, `PUT/DELETE /categories/:id` |
| Artisans | `GET/POST /artisans`, `PUT/DELETE /artisans/:id` |
| Coupons | `GET/POST /coupons`, `PUT/DELETE /coupons/:id` |
| Cities | `GET/POST /cities`, `PUT/DELETE /cities/:id` |
| Users | `GET /users`, `POST /users/:id/verify`, `DELETE /users/:id` (admin only) |
| Settings | `PUT /settings` |
| Contact | `GET /contact-messages`, `PATCH /contact-messages/:id`, `POST /contact-messages/:id/replies` |
| Accounts | `/accounts/suppliers`, `/accounts/purchases`, `/accounts/payments`, `/accounts/expenses`, `/accounts/report`, `/accounts/report.xlsx`, `/accounts/audit` |
| Uploads | `POST /upload`, `DELETE /upload` |
| Suppliers list | `GET /suppliers` |

> Admin requests must include the auth cookie/JWT and pass CSRF protection. Accounts routes
> additionally require a trusted origin and the `accounts` permission.

### Cron

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `ALL` | `/api/cron/payment-reminders` | Send pending payment reminders. Requires `Authorization: Bearer <CRON_SECRET>` when configured. |

---

## Available scripts

### Root

```sh
npm run install:all   # install root + server + client dependencies
npm run dev           # run API and client together
npm run dev:server    # run only the API
npm run dev:client    # run only the client
npm run build         # build the client for production
npm run start         # start the API
npm run lint          # lint the client
npm run seed          # seed sample catalog data
npm run seed:admin    # create the initial admin account
npm run kill-node     # force-stop Node processes (Windows)
```

### Client

```sh
npm run dev       # Vite dev server
npm run build     # production build
npm run preview   # preview the production build
npm run lint      # oxlint
npm run test:run  # Vitest
npm run e2e       # Playwright
```

### Server

```sh
npm run start     # start the API
npm run dev       # start with --watch
npm run lint      # oxlint
npm run test:run  # Vitest
npm run seed      # seed sample catalog data
npm run seed:admin # create the initial admin account
```

---

## Testing

```sh
# From client/
npm run lint
npm run test:run
npm run build

# From server/
npm run test:run
```

Playwright E2E tests require a running API, MongoDB, and suitable test data. CI skips E2E by
default; set the GitHub Actions variable `RUN_E2E` to `true` only after configuring the
`E2E_MONGODB_URI` and `E2E_JWT_SECRET` secrets and pre-seeding that test database.

---

## Troubleshooting & FAQ

### The API exits at startup or cannot reach MongoDB

- Confirm `MONGODB_URI` is set in `server/.env`.
- If you use Atlas, allow your current IP under **Network Access** and verify the cluster is
  running.
- A local MongoDB server must be running on the expected host and port.

### The browser shows a CORS error

- Set `CLIENT_URL` to the exact storefront origin, without a trailing slash (for example
  `http://localhost:5173`).
- `localhost` and `127.0.0.1` are allowed automatically only outside production.

### Firebase sign-in does not work

- Fill `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` on the server.
- Fill `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and
  `VITE_FIREBASE_APP_ID` on the client.
- Enable **Email/Password** and **Google** under Firebase Authentication → Sign-in method.
- Keep the `\n` escapes in `FIREBASE_PRIVATE_KEY` intact.

### Images will not upload in production

- Configure Cloudinary. Vercel's filesystem is ephemeral, so local uploads do not persist.
- Set `VITE_CLOUDINARY_CLOUD_NAME` on the client for optimized image delivery.

### Emails are not delivered

- Set `RESEND_API_KEY` and a verified `EMAIL_FROM`, or configure SMTP.
- In development, the API falls back to an Ethereal test inbox.
- Check the recipient's spam folder and the order's notification log under **Admin → Orders**.

### I cannot open an admin page

- Your staff role may not include that permission. See
  [Admin roles and permissions](#admin-roles-and-permissions).
- Customers, staff, and the activity log are administrator-only.

### Stock is not changing

- Product forms and bulk actions intentionally do not change stock.
- Use **Admin → Inventory** for adjustments or **Admin → Accounts → Purchases** for received
  goods. Every change is recorded in the stock-movement log.

### An order cannot be found on the tracking page

- Enter the exact order ID together with the phone or email used at checkout.
- Tracking lookups are rate-limited to prevent enumeration.

### I get "Too many requests" (HTTP 429)

- Auth, OTP, checkout, tracking, and accounts endpoints are rate-limited. Wait a few minutes, or
  review the limits in `server/utils/rateLimiters.js` and `server/routes/authRoutes.js`.

### Refreshing a route returns 404 in production

- The client `vercel.json` rewrites unknown paths to `index.html`. Make sure the client project
  is deployed with `client/` as its project root.

### Node version or install errors

- Use Node 20+ (CI uses Node 24). If dependencies are corrupted, remove `node_modules` and the
  lockfile only when necessary, then run `npm ci` again.

---

## Deployment

Deploy `client/` and `server/` as **separate Vercel projects**, with each directory set as its
project's root.

### API project

- Configure the production values from `server/.env.example`, including `MONGODB_URI`,
  `JWT_SECRET`, `CLIENT_URL`, Firebase credentials, and Cloudinary credentials.
- Set `NODE_ENV=production`.
- Configure `CRON_SECRET` if you use the payment-reminder cron.

### Client project

- Set `VITE_API_URL` to the production API URL.
- Set the public Firebase settings.
- Set `VITE_WHATSAPP_NUMBER` and `VITE_CLOUDINARY_CLOUD_NAME` as needed.

Both projects must use HTTPS so cross-origin auth cookies work correctly.

### CI/CD

- The GitHub workflow builds the client on pushes and pull requests.
- Client deployment from `main` is opt-in: set the Actions variable `DEPLOY_VERCEL` to `true`
  after configuring the `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` secrets.
- Deploy the backend Vercel project separately.
- Vercel's filesystem is ephemeral, so production uploads require Cloudinary.

### Payment-reminder cron

The backend payment-reminder cron runs daily at **00:00 UTC** to fit Vercel Hobby's once-per-day
cron limit. More frequent runs require a Vercel plan that supports them.

---

## Secrets and security

- Never commit `.env` files, production credentials, database backups, or service-account keys.
- `server/.env.atlas-backup` is intentionally ignored.
- Rotate any credentials that may have been shared or exposed.
- Keep `JWT_SECRET`, Firebase private keys, Cloudinary secrets, and SMTP/Resend keys private.
- Accounts endpoints reject untrusted browser origins, are rate-limited, and return `no-store`
  responses.
- Use HTTPS in production and restrict `CLIENT_URL` to your real storefront origin.
- Staff and admin passwords are hashed with bcrypt; customer passwords handled by Firebase are
  never stored in MongoDB.

---

## Contributing

1. Create a branch from `develop` or `main`.
2. Keep changes focused and follow the existing structure, naming, and styling.
3. Run `npm run lint` and the relevant unit tests before opening a pull request.
4. Never commit `.env` files, credentials, uploads, or database dumps.
5. Describe any schema, API, or admin-permission changes in the pull request.
