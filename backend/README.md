# caketown API

Express 5 + TypeScript + MongoDB (Mongoose) API shared by the caketown web app and mobile app.

## Run it

```bash
# from the repo root
npm install
cp backend/.env.example backend/.env      # set MONGODB_URI and JWT_ACCESS_SECRET
npm run seed                              # 5 categories, 30 products, 4 classes, 2 coupons, admin user
npm run dev:api                           # http://localhost:5000
```

Other scripts (from the root): `npm test`, `npm run typecheck`, `npm run build:api`, `npm run start:api`,
`npm run migrate:users` (one-time, for users from the old app), `npm run seed -- --reset`.

Tests start an in-memory MongoDB replica set (downloaded automatically the first time), so they
exercise real transactions. No external services are called.

## Integrations switch on when their keys are set

| Feature | Env vars | Without keys |
|---|---|---|
| Image uploads | `CLOUDINARY_*` | Upload endpoint returns 503 `UPLOADS_DISABLED` |
| Online payments | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Checkout offers Cash on Delivery only |
| Cache + shared rate limits | `REDIS_URL` (Upstash) | In-memory cache and limits |
| Email | `RESEND_API_KEY`, `EMAIL_FROM`, `SHOP_EMAIL` | Logged instead of sent |
| SMS | `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_*` | Logged; OTP code returned as `devCode` outside production |
| Push | works without keys; `EXPO_ACCESS_TOKEN` optional | — |

`GET /health` shows which are on.

## Conventions

- **Base URL** `/api/v1`. JSON in, JSON out.
- **Money** is always integer **paise** (₹899 = `89900`). Use `formatINR()` from `@caketown/shared`.
- **Errors** look like `{ "error": { "code": "OUT_OF_STOCK", "message": "…", "details": { "field": ["…"] } } }`.
  Validation errors are `422 VALIDATION_ERROR` with per-field `details`.
- **Dates**: delivery dates are `YYYY-MM-DD` in India time; timestamps are ISO strings.
- **Lists** return `{ items, page, limit, total, totalPages }`; pass `?page=&limit=` (max 60).
- Request/response types and zod schemas live in `packages/shared`, so the web and mobile apps
  validate forms with exactly the same rules.

## Authentication

| Client | How |
|---|---|
| Web | `POST /auth/login` sets two httpOnly cookies: `ct_at` (access, 15 min) and `ct_rt` (refresh, 30 days, path `/api/v1/auth`). Send requests with `credentials: "include"`. On `401 TOKEN_EXPIRED`, call `POST /auth/refresh` and retry. |
| Mobile | Send header `X-Client: mobile`. Tokens come back in the body (`accessToken`, `refreshToken`); store them in SecureStore and send `Authorization: Bearer <accessToken>`. Refresh with `POST /auth/refresh { refreshToken }`. |

Refresh tokens rotate on every use (an old one stops working), and up to 10 devices stay signed in.

## Endpoints

### Auth `/auth`
| Method | Path | Notes |
|---|---|---|
| POST | `/signup` | `{ name, email, phone, password, confirmPassword }` → 201 |
| POST | `/login` | `{ email, password }` |
| POST | `/refresh` | cookie or `{ refreshToken }` |
| POST | `/logout` · `/logout-all` | |
| GET / PATCH | `/me` | profile: `{ name?, phone?, avatar? }` |
| POST | `/change-password` | `{ currentPassword, newPassword }` signs out other devices |
| POST | `/forgot-password` · `/reset-password` | email link valid 30 min; `{ token, password }` |
| POST | `/otp/request` · `/otp/verify` | phone login for the mobile app `{ phone }` / `{ phone, code }` |

### Catalogue (public)
| Method | Path | Notes |
|---|---|---|
| GET | `/categories` | with `productCount` |
| GET | `/products` | `?q=&category=<slug>&dietary=eggless&minPrice=&maxPrice=&bestseller=true&featured=true&sort=popular\|newest\|price_asc\|price_desc\|rating` |
| GET | `/products/:slug` · `/products/:slug/related` | |
| GET / POST | `/products/:slug/reviews` | POST needs login; one review per customer (edits replace it). `verifiedPurchase` when they've had it delivered. |
| DELETE | `/products/:slug/reviews/mine` | |

### Cart & checkout (login required)
| Method | Path | Notes |
|---|---|---|
| GET / DELETE | `/cart` | |
| POST | `/cart/items` | `{ productId, variantId, quantity, flavour?, eggless?, message? }` — identical lines merge |
| PATCH / DELETE | `/cart/items/:itemId` | `{ quantity }` |
| POST | `/checkout/quote` | `{ couponCode? }` → subtotal, discount, delivery fee, total, `couponError` |
| POST | `/orders` | `{ addressId, deliveryDate, deliverySlot, paymentMethod: "cod"\|"razorpay", couponCode?, notes? }` |
| GET | `/orders` · `/orders/:id` | own orders only |
| POST | `/orders/:id/cancel` | before baking starts; online payments refunded automatically |
| POST | `/orders/:id/reorder` | copies items back into the cart |
| POST | `/payments/razorpay/verify` | `{ razorpayOrderId, razorpayPaymentId, razorpaySignature }` after Razorpay Checkout |

Delivery slots: `10:00-13:00`, `13:00-16:00`, `16:00-19:00`, `19:00-22:00`. A slot must start after
the longest preparation time in the cart (cheesecake 8 h, photo cake 24 h) and within 30 days.
Delivery is free from ₹999, otherwise ₹49.

**Razorpay flow:** `POST /orders` with `paymentMethod: "razorpay"` returns `razorpay: { keyId, orderId, amount, … }`.
Open Razorpay Checkout with them, then call `/payments/razorpay/verify`. The order is marked paid only
after Razorpay confirms it (the server fetches the payment, and the signed webhook does the same
independently; whichever comes first wins, duplicates are ignored). Unpaid orders release their stock
after `PAYMENT_HOLD_MINUTES`; a payment that arrives after that is refunded automatically.

### Account `/me` (login required)
`GET/POST /addresses`, `PATCH/DELETE /addresses/:id` · `GET /wishlist`, `PUT/DELETE /wishlist/:productId` ·
`GET /bookings` · `POST /devices { token, platform }`, `DELETE /devices/:token` (Expo push tokens)

### Baking classes
`GET /classes` · `GET /classes/:slug` · `POST /bookings { classId, sessionId, seats, paymentMethod: "pay_at_venue"|"razorpay" }` ·
`POST /bookings/:id/cancel` (up to 24 h before)

### Other
`POST /contact` · `POST /newsletter` · `POST /payments/razorpay/webhook` (Razorpay only) · `GET /health`

### Admin `/admin` (role `admin`)
| | |
|---|---|
| `GET /stats` | sales today / 7 / 30 days, revenue per day (30 points), orders by status, low stock, top products, deliveries today |
| `GET /orders` | `?status=&q=<order no, name, phone>&from=&to=` (delivery date) |
| `PATCH /orders/:id/status` | `{ status, note? }` placed → baking → out_for_delivery → delivered, or cancelled. Sends email + SMS + push. |
| `POST /orders/:id/refund` | `{ amount?, reason? }` partial or full |
| `GET/POST /products`, `GET/PATCH/DELETE /products/:id` | send variant `id`s when editing to keep carts working; products with orders are hidden, not deleted |
| `POST /categories`, `PATCH/DELETE /categories/:id` | |
| `PATCH /reviews/:id` | `{ isHidden }` |
| `GET/POST /classes`, `PATCH/DELETE /classes/:id`, `GET /bookings`, `POST /bookings/:id/cancel` | |
| `GET/POST /coupons`, `PATCH/DELETE /coupons/:id` | percent (1–100) or flat (paise); min order, max discount, usage and per-customer limits |
| `GET /users`, `PATCH /users/:id/role` | |
| `POST /uploads?folder=products` | multipart field `images` (up to 6, 5 MB each) → `{ images: [{ url, publicId, width, height }] }` |
| `DELETE /uploads` | `{ publicId }` |

## How data is kept correct

- **Transactions**: placing an order reduces stock, uses the coupon, creates the order and empties the
  cart in one MongoDB transaction (Atlas). On a plain local `mongod` (no replica set) the same steps run
  with manual rollback, and a warning is logged at startup.
- **Snapshots**: order items store name, variant, unit price and options; the address is copied too.
- **Stock** is reduced with a conditional update, so two shoppers can never buy the last cake twice.
- **Indexes** on email, slugs, category/price, order status, Razorpay order id, and a weighted text index for search.

## Rate limits (per IP unless noted)

Whole API 300 / 15 min · login, signup, password reset 10 / 15 min · OTP requests 5 / hour ·
checkout and bookings 20 / hour per user · contact and newsletter 5 / hour.
With `REDIS_URL` set, counts are shared across API instances.

## Folder layout

```
src/
  config/       env (validated with zod), db (+ transaction helper), redis, logger
  models/       User, Category, Product, Cart, Address, Order, Review, Coupon, BakingClass, Booking, misc
  controllers/  auth, catalog, commerce (cart/orders/payments/addresses/wishlist), classes, admin, misc
  services/     cache, cart, pricing, orders, bookings, payments, razorpay, cloudinary, email, sms, push, notify
  middleware/   auth, rateLimit, errorHandler
  templates/    branded HTML emails
  routes/v1/    route table
seed/           starter catalogue
scripts/        migrate-users.ts
tests/          vitest + supertest (47 tests)
```
