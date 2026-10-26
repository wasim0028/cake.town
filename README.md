# caketown

Fresh baked happiness, delivered. A bakery shop with a web app, a mobile app and one shared API.

| Folder | What | Status |
|---|---|---|
| `backend/` | Express 5 + TypeScript + MongoDB API | ✅ Phase A |
| `packages/shared/` | Types, zod schemas, constants and money helpers used by all apps | ✅ Phase A |
| `client/` | Next.js web app, with the admin dashboard at `/admin` | ✅ Phases B, C, E |
| `mobile/` | Expo app for Android and iPhone, with staff screens for admins | ✅ Phases D, E (`mobile` branch) |
| `legacy/` | The original Express server and React app, kept for reference | — |

**Stack:** Next.js · Expo · Express · MongoDB Atlas · Cloudinary · Razorpay · Upstash Redis · Resend · MSG91 · Expo Push

## Quick start

Requirements: Node 20.11+ and a MongoDB database (MongoDB Atlas free tier, or `mongod` locally).

```bash
npm install
cp backend/.env.example backend/.env     # fill in MONGODB_URI and JWT_ACCESS_SECRET
cp client/.env.example client/.env.local
npm run seed                             # sample catalogue + admin user
npm run dev:api                          # API → http://localhost:5000/health
npm run dev:web                          # in a second terminal → http://localhost:3000
npm run dev:mobile                       # the app, with Expo Go
npm test                                 # API tests
```

Every external service is optional and switches on when its keys are added to `backend/.env`.
See [backend/README.md](backend/README.md) for the API reference and [client/README.md](client/README.md) for the design system and animations.

### Admin

Sign in with the admin account the seed creates (`ADMIN_EMAIL` / `ADMIN_PASSWORD` in `backend/.env`)
and open `/admin`. To make someone else an admin, open **Customers** and choose **Make admin**.

### Moving from the old Cake Town database

Point `MONGODB_URI` at the existing database and run `npm run migrate:users` once
(`-- --dry-run` previews it). Existing customers keep their passwords.

## Roadmap

- **A. Backend** ✅ auth (cookies + bearer, refresh rotation, OTP), catalogue, cart, checkout with
  transactions, Razorpay + webhook, coupons, reviews, wishlist, addresses, baking classes and bookings,
  admin API, Cloudinary uploads, Redis cache and rate limits, email/SMS/push notifications, tests.
- **B. Web foundation** ✅ Next.js, design tokens, self-hosted fonts, product illustrations, navbar,
  footer, cart drawer, dark mode, page transitions, smooth scroll, custom cursor, home page on live data.
- **C. Web pages** ✅ shop with search and filters, product pages with reviews, cake designer with live
  preview, sign-up/login/password reset, checkout (saved addresses, delivery slots, coupons, COD and
  Razorpay), live order tracking, account (profile, orders, favourites, addresses, classes), class
  booking, about, contact, help, recipes, privacy, terms, sitemap.
- **D. Mobile app** ✅ animated splash, onboarding, home, menu, product, cake designer, cart with
  swipe-to-remove, email/OTP sign-in, checkout with Razorpay, live order tracking, classes, account,
  dark mode, haptics, push notifications. See [mobile/README.md](mobile/README.md).
- **E. Admin dashboard** ✅ at `/admin` for admin accounts: today's numbers and a 30-day revenue chart,
  orders (filters, status changes that email/SMS/push the customer, refunds, print), a printable
  kitchen list per delivery day, products (sizes, stock, photos via Cloudinary or a pasted link),
  categories, baking classes with dates and bookings, coupons, customers and admin roles, review
  moderation, and the contact inbox. New orders show up as a badge, a toast and a count in the
  browser tab within 30 seconds.
  In the app, admins get a **Staff** section: new-order push notifications, today's numbers, orders
  with one-tap status changes, the kitchen list, stock and visibility switches, and the inbox.
- **F. Polish:** SEO, accessibility, Lighthouse, deployment guide.
