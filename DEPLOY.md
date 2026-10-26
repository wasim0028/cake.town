# Deploying caketown

This guide takes caketown from this repository to a live shop: the website on **Vercel**, the API
on **Render**, the database on **MongoDB Atlas**, and the apps on Google Play and the App Store via
**Expo EAS**. Every outside service is optional apart from the database; each one switches on as
soon as its keys are added.

```
 customers' browsers ──► caketown.in (Vercel, Next.js) ──/api/v1/*──► api.caketown.in (Render, Express)
 Android / iPhone app ──────────────────────────────────────────────►        │
 Razorpay webhooks ─────────────────────────────────────────────────►        │
                                                                             ├─► MongoDB Atlas (Mumbai)
                                                                             ├─► Upstash Redis (Mumbai)
                                                                             ├─► Cloudinary · Razorpay · Resend · MSG91 · Expo Push
```

The website never calls the API from the browser directly: Next.js forwards `/api/v1/*` to it.
That keeps the login cookies on your own domain, so there is no cross-site cookie or CORS setup.

**Time needed:** about two hours for web + API + database. Store listings take longer because
of Google and Apple review (a few days).

**Costs (Oct 2026, approximate):** Atlas M0 free (move to M10 when you're busy), Render Starter
about $7/month (the free tier sleeps and makes the first visit slow), Vercel Hobby free for a
personal project or Pro for a business, Upstash/Cloudinary/Resend free tiers, Razorpay per
transaction, MSG91 per SMS, Apple Developer $99/year, Google Play $25 once.

---

## 1. Database: MongoDB Atlas

1. Create a project at [cloud.mongodb.com](https://cloud.mongodb.com) and a cluster in
   **AWS / Mumbai (ap-south-1)**.
2. **Database Access** → add a user with a long generated password and the *Read and write to
   any database* role.
3. **Network Access** → add `0.0.0.0/0` (Render's outgoing addresses change). The strong password
   is what protects the database.
4. **Connect → Drivers** → copy the connection string and put the database name before the `?`:
   `mongodb+srv://caketown:<password>@cluster0.xxxxx.mongodb.net/caketown?retryWrites=true&w=majority`

Atlas clusters are replica sets, so orders are saved in real database transactions (stock, coupon,
order and cart change together or not at all).

## 2. API: Render

1. [render.com](https://render.com) → **New → Web Service** → connect the GitHub repo.
2. Settings:

   | Setting | Value |
   |---|---|
   | Branch | the branch you deploy (`redesign` today; `main` once merged) |
   | Region | **Singapore** (closest to India) |
   | Root directory | *(leave empty: the repo root)* |
   | Runtime | Node 20 or newer |
   | Build command | `npm ci && npm run build:api` |
   | Start command | `npm run start:api` |
   | Health check path | `/health` |
   | Instance | Starter or above, **one instance** (see below) |

3. **Environment** → add the variables from [API variables](#api-variables). At minimum:
   `NODE_ENV=production`, `MONGODB_URI`, `JWT_ACCESS_SECRET`, `WEB_URL=https://caketown.in`,
   `CORS_ORIGINS=https://caketown.in`, `TRUST_PROXY=2`.
4. Deploy, then open `https://<your-service>.onrender.com/health`. It should answer `{"ok":true,…}`
   with a `features` list showing which integrations are switched on.
5. **Settings → Custom Domains** → add `api.caketown.in` and create the CNAME it shows at your DNS
   provider.
6. Create the admin account and sample catalogue once, from **Shell** in the Render dashboard:
   ```bash
   npm run seed        # uses ADMIN_EMAIL and ADMIN_PASSWORD
   ```
   Skip the seed if you're moving the old Cake Town database across; run `npm run migrate:users`
   instead (`-- --dry-run` previews it).

**One instance:** the API releases stock held by abandoned online payments every five minutes from
inside the server. Several instances would all run that sweep (harmless, just wasteful), and
without Redis each instance keeps its own rate-limit counters. Add Redis before scaling out.

**TRUST_PROXY:** requests from the website pass through two proxies (Vercel, then Render's load
balancer), so `TRUST_PROXY=2` lets the API see each shopper's real address for rate limits. With
`1`, every web visitor would share one limit. If you serve the API without Vercel in front, use `1`.

*Railway, Fly.io or a small VPS work the same way: build with `npm run build:api`, start with
`npm run start:api`, health check `/health`.*

## 3. Website: Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
2. Settings:

   | Setting | Value |
   |---|---|
   | Root directory | `client` (Vercel installs the whole npm workspace, including `packages/shared`) |
   | Framework | Next.js (detected) |
   | Production branch | the same branch as the API |
   | Function region | **Mumbai (bom1)**: Settings → Functions |

3. **Environment variables** (Production and Preview):

   | Name | Value |
   |---|---|
   | `API_URL` | `https://api.caketown.in` |
   | `NEXT_PUBLIC_SITE_URL` | `https://caketown.in` (canonical links, sitemap, share images) |
   | `NEXT_PUBLIC_SHOP_ADDRESS` | optional: street address shown on Contact and sent to Google |
   | `NEXT_PUBLIC_SHOP_MAP_QUERY` | optional: e.g. `caketown, 12 Park Street, Bengaluru` shows a map |
   | `NEXT_PUBLIC_SHOP_PHONE` | optional: `+91…` for Google's business listing |
   | `NEXT_PUBLIC_SHOP_CITY` | defaults to `Bengaluru` |
   | `NEXT_PUBLIC_SHOP_PINCODE` | optional |

4. Deploy, then **Settings → Domains** → add `caketown.in` and `www.caketown.in` (redirect `www`
   to the bare domain) and follow the DNS instructions.

`NEXT_PUBLIC_*` values are baked in at build time: change them, then redeploy.

## 4. Services

Add each service's keys to the **API** on Render, then redeploy. `/health` shows which are active.

### Upstash Redis: cache and shared rate limits
Create a Redis database in **ap-south-1 (Mumbai)** at [upstash.com](https://upstash.com), open
**Connect**, choose *ioredis*, and copy the `rediss://…` URL into `REDIS_URL`. Without it, the
API caches in memory and rate limits per instance.

### Cloudinary: product photos
From the [Cloudinary](https://cloudinary.com) dashboard copy the cloud name, API key and secret into
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Uploads from the admin
dashboard go to the `caketown/…` folders and are served resized in AVIF/WebP. Until then, admins
can paste image links.

### Razorpay: online payments
1. Start with **test mode** keys (`rzp_test_…`) in `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
2. **Settings → Webhooks → Add**: URL `https://api.caketown.in/api/v1/payments/razorpay/webhook`,
   events `payment.captured`, `order.paid`, `payment.failed`, `refund.processed`; put the secret
   you choose in `RAZORPAY_WEBHOOK_SECRET`.
3. Place a test order on the site and in the app with Razorpay's test cards/UPI, then refund it
   from the admin dashboard.
4. After KYC is approved, switch to **live** keys and add the webhook again in live mode (test and
   live webhooks are separate).

Cash on delivery works without Razorpay.

### Resend: email
Add and verify your domain at [resend.com](https://resend.com) (it gives you SPF/DKIM DNS records),
then set `RESEND_API_KEY`, `EMAIL_FROM` (an address on that domain, e.g.
`caketown <orders@caketown.in>`), and `SHOP_EMAIL` (where new orders and contact messages go).

### MSG91: SMS
Indian SMS needs DLT registration. Register your business and sender ID on a DLT portal (Jio,
Airtel, Vi…), get two templates approved, then create matching **Flows** in MSG91:

| Variable | Template must contain |
|---|---|
| `MSG91_TEMPLATE_ORDER_UPDATE` | `##name##`, `##order##`, `##status##` |
| `MSG91_TEMPLATE_OTP` | `##otp##` |

Set `MSG91_AUTH_KEY` too. Without SMS, customers still get email and app notifications, and the
app's "use a one-time code" sign-in is hidden.

### Expo push notifications
Order updates for customers, and new orders and messages for staff phones. They need a real app
build (step 5). `EXPO_ACCESS_TOKEN` is optional: create one in your Expo account and turn on
*Enhanced security for push notifications* if you want only your server to be able to send.

## 5. Mobile app: Expo EAS

The app lives in `mobile/` on the **`mobile`** branch.

```bash
git checkout mobile
npm install
npm install -g eas-cli
eas login
cd mobile
eas init                      # creates the Expo project and writes its id into app.json
```

1. Check `mobile/eas.json`: the `preview` and `production` profiles point at
   `https://api.caketown.in` and `https://caketown.in`.
2. **Push credentials:**
   - Android: create a Firebase project, add an Android app with package `com.caketown.app`,
     download the service-account key and upload it with `eas credentials` (*Google Service Account
     Key for FCM V1*).
   - iPhone: `eas credentials` creates the push key for you once your Apple Developer account is
     connected.
3. A test build to install on your own phone:
   ```bash
   eas build --profile preview --platform android    # gives an .apk link
   ```
   Sign in, place a cash order, change its status in the admin dashboard and watch the
   notification arrive. Sign in as an admin to see the **Staff** section.
4. Store builds and submission:
   ```bash
   eas build --profile production --platform all
   eas submit --platform android    # Google Play (create the app in Play Console first)
   eas submit --platform ios        # App Store Connect
   ```
5. Store listings need: the privacy policy URL (`https://caketown.in/privacy`), screenshots, a
   support email, and a demo login for the reviewers (a normal customer account). For Google's
   *Data safety* and Apple's *privacy labels*: the app collects name, email, phone, delivery
   address, order history and a push token; payments are handled by Razorpay.

Small changes to screens can later go out with `eas update` (no store review). New native
modules or permissions need a new build.

## 6. Go-live checklist

- [ ] `https://api.caketown.in/health` answers `"ok":true` and `features` lists the integrations you expect.
- [ ] `JWT_ACCESS_SECRET` is a fresh 48-byte random string, not reused from development.
- [ ] Admin password changed from anything used in testing; extra staff made admins from
      **Admin → Customers**.
- [ ] Sign up, sign in, close the browser, come back an hour later: still signed in.
- [ ] Cash order and an online order (test mode) placed end to end; emails received; order moved
      through every status from the admin dashboard; customer notified each time.
- [ ] A refund from the admin dashboard shows up in Razorpay.
- [ ] Real products, prices, photos and stock entered; sample products from the seed hidden or
      deleted.
- [ ] Wording on **About**, **Privacy** and **Terms** replaced with your own (the privacy policy
      must match what you actually collect).
- [ ] Razorpay switched to live keys and the live webhook added.
- [ ] Contact page address/map variables set if customers can visit.
- [ ] Share a product link on WhatsApp: the preview card shows the name, price and photo.

## 7. After launch

- **Google:** add the site to [Search Console](https://search.google.com/search-console), submit
  `https://caketown.in/sitemap.xml`, and check *Enhancements* for the product, breadcrumb and
  event results. Create a Google Business Profile with the same name, address and hours.
- **Backups:** Atlas M10+ has continuous backups. On M0, run `mongodump` on a schedule or upgrade
  before you depend on the data.
- **Monitoring:** Render already checks `/health`; add an external uptime check (UptimeRobot,
  Better Stack) on both `https://caketown.in` and `/health`. Logs are JSON (pino) in the Render and
  Vercel dashboards.
- **Updates:** pushing to the deploy branch redeploys both the API and the website.
- **Secrets:** keep `.env` files out of git (they're ignored). Rotate keys in each provider's
  dashboard, update Render/Vercel, redeploy.

## API variables

| Variable | Needed | What it does |
|---|---|---|
| `NODE_ENV` | yes | `production` (secure cookies, no stack traces) |
| `PORT` | no | Render sets it |
| `MONGODB_URI` | yes | Atlas connection string with database name |
| `JWT_ACCESS_SECRET` | yes | 32+ random characters: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `ACCESS_TOKEN_TTL_MIN` / `REFRESH_TOKEN_TTL_DAYS` | no | 15 minutes / 30 days |
| `WEB_URL` | yes | `https://caketown.in`, used in email links |
| `CORS_ORIGINS` | yes | `https://caketown.in` (comma separated; apps need no entry) |
| `COOKIE_DOMAIN` | no | leave empty with the Vercel proxy setup |
| `TRUST_PROXY` | yes | `2` behind Vercel + Render, `1` behind a single proxy |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | for seed | the first admin account |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` / `_FOLDER` | optional | photo uploads |
| `RAZORPAY_KEY_ID` / `_KEY_SECRET` / `_WEBHOOK_SECRET` | optional | online payments |
| `PAYMENT_HOLD_MINUTES` | no | how long unpaid online orders hold stock (30) |
| `REDIS_URL` | optional | Upstash `rediss://` URL |
| `RESEND_API_KEY` / `EMAIL_FROM` / `SHOP_EMAIL` | optional | email |
| `MSG91_AUTH_KEY` / `MSG91_TEMPLATE_ORDER_UPDATE` / `MSG91_TEMPLATE_OTP` | optional | SMS and sign-in codes |
| `EXPO_ACCESS_TOKEN` | optional | secured push |
| `LOG_LEVEL` | no | `info` |

## App variables (`mobile/eas.json` profiles)

| Variable | Value |
|---|---|
| `EXPO_PUBLIC_API_URL` | `https://api.caketown.in` |
| `EXPO_PUBLIC_WEB_URL` | `https://caketown.in` |

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Website shows no products | `API_URL` wrong on Vercel, or the API is asleep/crashed: open `/health` |
| Signed out after every refresh | the site isn't on `https`, or `NEXT_PUBLIC_SITE_URL`/domain mismatch; cookies are `Secure` in production |
| "Too many requests" for everyone | `TRUST_PROXY` too low: use `2` behind Vercel + Render |
| Online orders stay "awaiting payment" | Razorpay webhook URL or secret wrong, or set up in test mode only |
| Photos don't appear | images must be on `res.cloudinary.com` (allowed in `client/next.config.ts`) |
| No emails | domain not verified in Resend, or `EMAIL_FROM` isn't on that domain |
| App can't connect | `EXPO_PUBLIC_API_URL` in the build profile; rebuild after changing it |
| No push on the phone | push credentials missing (`eas credentials`), or notifications denied in phone settings |
