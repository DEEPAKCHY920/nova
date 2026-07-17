# NOVA Backend API

Node.js + Express + MongoDB backend for the NOVA storefront (`nova.orbitstack.in` /
[DEEPAKCHY920/nova](https://github.com/DEEPAKCHY920/nova)).

Covers: customer auth, product catalog, server-side cart, wishlist, orders (Cash on
Delivery), and the admin endpoints the site's `admin*.html` pages need.

## 1. Setup

```bash
cd nova-backend
npm install
cp .env.example .env   # then fill in MONGO_URI and JWT_SECRET
```

Start MongoDB (local `mongod`, or use a free MongoDB Atlas cluster and paste its
connection string into `MONGO_URI`).

Seed sample products + the first admin account:

```bash
npm run seed
```

This reads `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env` (defaults to
`admin@nova.orbitstack.in` / `ChangeMe123!` — **change this password on first login**).

Run the API:

```bash
npm run dev     # nodemon, auto-restart
npm start       # plain node
```

Health check: `GET http://localhost:5000/api/health`

## 2. How auth works

Login/register set an **httpOnly cookie** (`nova_token`, a JWT). The frontend must
call the API with `credentials: 'include'` so the browser sends/receives that
cookie — e.g.:

```js
fetch('https://api.nova.orbitstack.in/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ email, password })
});
```

`CLIENT_URL` in `.env` must list the exact frontend origin(s) — CORS with
credentials cannot use `*`. For local development it's usually
`http://localhost:3000,http://127.0.0.1:5500` (adjust for whatever serves the
static HTML files).

Admin pages should call `POST /api/auth/admin-login` instead of `/api/auth/login`
— it rejects any account that isn't `role: "admin"`, so a customer can never land
on `admin.html` even if they guess the URL.

Every protected route also accepts `Authorization: Bearer <token>` as a fallback,
which is convenient for testing with curl/Postman.

## 3. Replacing the frontend's localStorage cart/wishlist

`collection.js` currently reads/writes `localStorage.nova_cart`. Swap those calls
for the `/api/cart` endpoints below (still gate "Add to cart" on being logged in,
or keep a localStorage cart for guests and merge it into `/api/cart` right after
login — either is a reasonable next step, just not included here since it's a UX
decision, not a backend one).

## 4. API Reference

All responses are JSON: `{ success: boolean, ...data }` on success, or
`{ success: false, message }` on error.

### Auth — `/api/auth`
| Method | Route | Access | Body |
|---|---|---|---|
| POST | `/register` | Public | `name, email, password, phone?` |
| POST | `/login` | Public | `email, password` |
| POST | `/admin-login` | Public | `email, password` (must be an admin account) |
| POST | `/logout` | Public | — |
| GET | `/me` | Private | — |
| PUT | `/me` | Private | `name?, phone?` |
| PUT | `/password` | Private | `currentPassword, newPassword` |
| POST | `/addresses` | Private | `fullName, phone, line1, city, state, pincode, isDefault?` |
| DELETE | `/addresses/:addressId` | Private | — |

### Products — `/api/products`
| Method | Route | Access | Notes |
|---|---|---|---|
| GET | `/` | Public | Query: `category, gender, size, color, feature, tag, minPrice, maxPrice, search, sort, page, limit` |
| GET | `/meta/categories` | Public | Counts per category, for the filter sidebar |
| GET | `/:idOrSlug` | Public | Accepts a Mongo `_id` or the product `slug` |
| GET | `/admin/all` | Admin | Includes inactive products |
| POST | `/` | Admin | Create product |
| PUT | `/:id` | Admin | Update product |
| DELETE | `/:id` | Admin | Delete product |

`sort` values: `featured` (default), `price-low`, `price-high`, `rating`, `newest`.

### Cart — `/api/cart` (all Private)
| Method | Route | Body |
|---|---|---|
| GET | `/` | — |
| POST | `/` | `productId, size, qty?` |
| PUT | `/:itemId` | `qty` (0 removes the item) |
| DELETE | `/:itemId` | — |
| DELETE | `/` | Clears the cart |

### Wishlist — `/api/wishlist` (all Private)
| Method | Route |
|---|---|
| GET | `/` |
| POST | `/:productId` |
| DELETE | `/:productId` |

### Orders — `/api/orders` (all Private)
| Method | Route | Access | Notes |
|---|---|---|---|
| POST | `/` | Customer | Places a COD order from the current cart; validates & decrements stock |
| GET | `/mine` | Customer | Own order history |
| GET | `/:id` | Owner or Admin | — |
| PUT | `/:id/cancel` | Owner | Only while `placed` or `confirmed` |
| GET | `/` | Admin | All orders; query: `status, page, limit` |
| PUT | `/:id/status` | Admin | `status, note?` — moves through `placed → confirmed → processing → shipped → delivered`, or `cancelled` |

### Admin — `/api/admin` (all Admin-only)
| Method | Route | Notes |
|---|---|---|
| GET | `/stats` | Dashboard numbers for `admin.html`: customers, products, orders, revenue, recent orders, status breakdown |
| GET | `/customers` | Query: `search, page, limit` |
| GET | `/customers/:id` | Customer + their order history |
| PUT | `/customers/:id/status` | `isActive: boolean` |
| GET | `/settings` | Store settings (shipping fee, free-shipping threshold, tax %, COD toggle) |
| PUT | `/settings` | Update any of the above |

## 5. Project structure

```
nova-backend/
├── server.js
├── .env.example
├── package.json
└── src/
    ├── config/db.js
    ├── models/        User, Product, Cart, Order, Settings
    ├── middleware/     auth (protect/admin), asyncHandler, errorHandler
    ├── controllers/    auth, product, cart, wishlist, order, admin
    ├── routes/         one file per resource, mounted in server.js
    └── seed/           seedProducts.js
```

## 6. Deploying

- **Database**: MongoDB Atlas free tier works fine to start.
- **API host**: Render, Railway, Fly.io, or a small VPS all work — anywhere that
  runs a long-lived Node process (this isn't written as serverless functions).
- Set `NODE_ENV=production`, a strong random `JWT_SECRET`, and `CLIENT_URL` to
  your real frontend domain(s) (e.g. `https://nova.orbitstack.in`) before going
  live — the cookie is also marked `secure` in production, so the API must be
  served over HTTPS.

## 7. Not included (flagged, not forgotten)

- **Payments**: COD only, per your request — no Razorpay/Stripe integration.
  `paymentStatus` flips to `paid` when an admin marks an order `delivered`.
- **Image uploads**: `Product.images` is just an array of URL strings — plug in
  Cloudinary/S3/multer later if you want the admin panel to upload files directly
  instead of pasting URLs.
- **Reviews**: `Product.rating` is a simple `{ average, count }` pair, seeded with
  static numbers — no per-user review model yet.
- **Email**: no order-confirmation emails are sent (no mail provider configured).
