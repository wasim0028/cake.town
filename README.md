# caketown

Fresh baked happiness, delivered. A bakery shop with a web app, a mobile app and one shared API.

| Folder | What | Status |
|---|---|---|
| `backend/` | Express 5 + TypeScript + MongoDB API | ✅ Phase A |
| `packages/shared/` | Types, zod schemas, constants and money helpers used by all apps | ✅ Phase A |
| `client/` | Web app — will be rebuilt in **Next.js** (App Router) | ⏳ Phase B–C (old React app still here until then) |
| `mobile/` | Expo (React Native) app | ⏳ Phase D |
| `legacy/` | The original Express server, kept for reference | — |

**Stack:** Next.js · Expo · Express · MongoDB Atlas · Cloudinary · Razorpay · Upstash Redis · Resend · MSG91 · Expo Push

## Quick start (API)

Requirements: Node 20.11+ and a MongoDB database (MongoDB Atlas free tier, or `mongod` locally).

```bash
npm install
cp backend/.env.example backend/.env     # fill in MONGODB_URI and JWT_ACCESS_SECRET
npm run seed                             # sample catalogue + admin user
npm run dev:api                          # → http://localhost:5000/health
npm test                                 # 46 API tests
```

Every external service is optional and switches on when its keys are added to `backend/.env`.
See [backend/README.md](backend/README.md) for the full API reference.

### Moving from the old Cake Town database

Point `MONGODB_URI` at the existing database and run `npm run migrate:users` once
(`-- --dry-run` previews it). Existing customers keep their passwords.

> The old React app in `client/` still calls the old routes (`/signup`, `/login`, …), which the new
> API no longer serves. It is replaced by the Next.js app in the next phase.

## Roadmap

- **A. Backend** ✅ auth (cookies + bearer, refresh rotation, OTP), catalogue, cart, checkout with
  transactions, Razorpay + webhook, coupons, reviews, wishlist, addresses, baking classes and bookings,
  admin API, Cloudinary uploads, Redis cache and rate limits, email/SMS/push notifications, tests.
- **B. Web foundation:** Next.js, design tokens, fonts, layout, navbar, footer, dark mode, base animations.
- **C. Web pages:** home, shop, product, cake builder, cart, checkout, tracking, classes, account, 404.
- **D. Mobile app:** Expo screens, gestures, haptics, push notifications.
- **E. Admin dashboard + notification flows.**
- **F. Polish:** SEO, accessibility, Lighthouse, deployment guide.
