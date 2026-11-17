# Hunzora — Client

The React storefront and admin dashboard for Hunzora (Karakoram Store). For full project
documentation — including the API, database, stock management, accounts, deployment, and
administrator workflows — see the [root README](../README.md).

---

## Stack

- React 19 + React Router 7
- Vite 8 with `@vitejs/plugin-react`
- Tailwind CSS 4 (`@tailwindcss/vite`)
- TanStack Query 5 for server state
- Axios for API requests
- Firebase Auth for customer sign-in
- Vitest + Testing Library for unit tests, Playwright for E2E
- oxlint for linting

---

## Local development

### 1. Install dependencies

```sh
npm ci
```

### 2. Configure environment

```sh
cp .env.example .env
```

Set at minimum:

```env
VITE_API_URL=http://localhost:5000/api
```

Optional values:

```env
API_BASE_URL=http://localhost:5000/api
SITE_URL=http://localhost:5173
VITE_WHATSAPP_NUMBER=+923001234567
VITE_CLOUDINARY_CLOUD_NAME=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

The Firebase values are public client identifiers, not secrets. Enable Email/Password and
Google under Firebase Console → Authentication → Sign-in method.

### 3. Start the app

```sh
npm run dev
```

Vite serves the storefront at `http://localhost:5173`. Start the API from `server/` (or run
`npm run dev` from the repository root) so the client can load data.

---

## Project structure

```text
src/
├── App.jsx                 # Routes and providers
├── main.jsx                # React entry point
├── firebase.js             # Firebase web-app initialization
├── index.css               # Tailwind import and design tokens
├── components/
│   ├── admin/              # AdminGuard, AdminLayout, invoice, voucher
│   ├── layout/             # Navbar, Footer, Layout, bottom nav, announcement bar
│   └── ui/                 # Product card, images, timeline, SEO, skeletons, etc.
├── context/                # Auth, cart, wishlist, toast providers
├── hooks/                  # Shared hooks (site settings)
├── lib/                    # Axios, cart, payment, region, and admin helpers
└── pages/
    ├── ...                 # Storefront pages
    └── admin/              # Admin workspace pages
```

---

## Routes

### Storefront

| Route | Page |
|-------|------|
| `/` | Home |
| `/shop` | Shop / catalog |
| `/products/:slug` | Product detail |
| `/cart` | Cart |
| `/checkout` | Checkout |
| `/order-success` | Order confirmation |
| `/track-order` | Public order tracking |
| `/login` | Sign in |
| `/register` | Create account |
| `/my-orders` | Customer order history (`/orders` and `/dashboard` also resolve here) |
| `/wishlist` | Saved products |
| `/about` | About |
| `/contact` | Contact |
| `*` | Not found |

### Admin

| Route | Page |
|-------|------|
| `/admin` | Dashboard |
| `/admin/products` | Product list |
| `/admin/products/new` | Create product |
| `/admin/products/:id/edit` | Edit product |
| `/admin/inventory` | Stock overview, adjustments, movements, reorder alerts |
| `/admin/categories` | Categories |
| `/admin/artisans` | Artisans |
| `/admin/orders` | Orders and shipment logistics |
| `/admin/pos` | Point of sale |
| `/admin/users` | Customers |
| `/admin/staff` | Staff accounts and roles |
| `/admin/activity` | Activity log |
| `/admin/coupons` | Coupons |
| `/admin/cities` | Cities / regions |
| `/admin/settings` | Store settings |
| `/admin/contact-messages` | Contact inbox |
| `/admin/accounts` | Suppliers, purchases, expenses, reports |

Admin pages are lazy-loaded and protected by `AdminGuard`. Access is limited by role; see
`src/lib/adminAccess.js`.

---

## Scripts

```sh
npm run dev       # start Vite
npm run build     # production build
npm run preview   # preview the production build
npm run lint      # oxlint
npm run test:run  # Vitest (single run)
npm run e2e       # Playwright
```

---

## Notes

- Cart and wishlist state are stored in the browser; the cart is revalidated against the API
  before checkout.
- Product images are optimised through Cloudinary when `VITE_CLOUDINARY_CLOUD_NAME` is set;
  otherwise the original URLs are used.
- The public catalog is persisted through React Query so repeat visits render instantly and
  revalidate in the background.
- Product ratings and reviews are optional and only appear when review data exists.
