# caketown web

Next.js 16 (App Router) + React 19 + TypeScript. Talks to the caketown API through a same-origin
proxy (`/api/v1/*` → `API_URL`), so the API's httpOnly login cookies just work.

```bash
# from the repo root, with the API running (npm run dev:api)
cp client/.env.example client/.env.local
npm run dev:web          # http://localhost:3000
npm run build:web && npm run start:web
```

## Design system

| | |
|---|---|
| **Palette** | flour `#F7F1E7` (page), crumb `#EFE5D3` (plates), cocoa `#1F1611` (text, dark sections), caramel `#C8893B` (accent fills), crust `#8A4B1F` (links), pistachio `#8FA87C` (eggless / fresh). Dark mode remaps the semantic tokens in `src/styles/tokens.css`. |
| **Type** | Fraunces (variable: weight, optical size, SOFT, WONK) for headings, DM Sans for everything else. Major-third scale on a 17px base. Both self-hosted from npm, so builds never call Google Fonts. |
| **Shape** | Products sit on round plates rather than cards. Radii 8 / 14 / 24px and pills; warm cocoa-tinted shadows. |
| **Art** | `src/components/art/BakeArt.tsx` draws every product (red velvet is red, the cheesecake has blueberry compote, the sourdough has its ear). Uploaded photos replace the drawings automatically. |

Text colours meet WCAG AA: caramel is only used for fills and large display text; links use crust.

## Motion

| Where | What | How |
|---|---|---|
| Hero | Headline lines rise while the Fraunces SOFT and weight axes swell ("dough rising"); cake floats on its stand; sprinkles drift; cake parallaxes on scroll | CSS keyframes, GSAP ScrollTrigger |
| Pages | Fade + 12px lift on every navigation | CSS in `app/template.tsx` |
| Scroll | Sections and product plates fade up once, staggered | `<Reveal>` + IntersectionObserver |
| Smooth scroll | Lenis on mouse/trackpad (native on touch) | `SmoothScroll.tsx` |
| Products | Bake lifts off the plate on hover, breads steam, "Add" rises into view, item flies into the cart, badge bumps, heart bursts | CSS + Web Animations API |
| Buttons | Ripple from the press point, caramel sheen sweep on primary | `Button.tsx` |
| Navbar | Transparent → frosted glass on scroll, underline grows on links, hamburger folds into an X | CSS |
| Cart & menu | Slide-in drawers with focus trap and Esc to close | CSS transitions (no library, so nothing loads until opened) |
| Cursor | Caramel dot that swells over clickable things (desktop mouse only) | `Cursor.tsx` |
| Everywhere | Skeleton shimmer, toasts | CSS |

Everything respects **prefers-reduced-motion**: animations are switched off, smooth scroll and the
custom cursor don't start, and content is never hidden waiting for an animation.

## Pages

| Route | What |
|---|---|
| `/` | Hero, bestsellers, categories, reviews, classes, newsletter |
| `/shop`, `/shop/[category]` | Search (debounced, in the URL), category, eggless/vegan/gluten-free, price, sort, infinite scroll |
| `/product/[slug]` | Size, flavour, eggless, message, quantity, reviews, related; Product structured data for Google |
| `/cake-builder` | Six steps with a live drawing of the cake and an animated price |
| `/checkout` | Signs in first; copies the browser cart to the account; address, day and slot, payment, coupon |
| `/account/*` | Profile and password, orders and live tracking, favourites, addresses, class bookings |
| `/classes`, `/classes/[slug]` | Dates with seats left, booking (pay at the studio or online) |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | Accounts |
| `/about`, `/contact`, `/help`, `/blog`, `/privacy`, `/terms` | Content. Replace the wording in `about`, `privacy` and `terms` with your own before launch. |
| `/admin/*` | Admin dashboard (admin accounts only; not indexed). The shop navbar, footer and cart are hidden here. |

### Admin dashboard

| Route | What |
|---|---|
| `/admin` | Today, 7- and 30-day revenue, revenue per day chart (with a table view), orders by status, today's deliveries, low stock, top sellers |
| `/admin/orders`, `/admin/orders/[id]` | Filter by status, search, delivery dates; move an order along (each change notifies the customer), cancel, refund online payments, print |
| `/admin/kitchen` | Everything to bake for a day, totalled, then each order by delivery slot. Prints cleanly. |
| `/admin/products`, `/admin/products/[id]` | Filters (in the shop, hidden, low stock, category); editor for sizes, prices, stock, photos, flavours, eggless, builder, visibility |
| `/admin/categories`, `/admin/coupons`, `/admin/classes` | Create and edit in a side panel. Classes include dates, seats and the bookings list. |
| `/admin/customers`, `/admin/reviews`, `/admin/messages` | Orders and spend per customer, admin roles; hide reviews; contact inbox |

Photos upload through `POST /admin/uploads` to Cloudinary. Before Cloudinary keys are set, paste an
image link instead. The sidebar polls for new orders every 30 seconds and shows a toast when one arrives.

**Cart:** guests keep their cart in the browser. At checkout it is copied into their account with one
`PUT /cart` call; the server re-prices everything and drops anything no longer available (and says why).

**Payments:** the Razorpay window loads only when someone pays online. After payment the API checks
with Razorpay before confirming; if the window is closed, the order is held for 30 minutes and the
"Try paying again" button reopens it.

## Structure

```
src/
  app/            layout, page (home), template (page transition), not-found, fonts, icon; admin/ for the dashboard
  components/
    admin/        AdminShell, kit (tables, badges, filters), RevenueChart, Drawer, ImagePicker and one file per page
    art/          BakeArt (product drawings), HeroCake
    home/         Hero, NextSlot, HeroParallax, Sections (trust strip, bestsellers, categories, kitchen), Newsletter
    layout/       Navbar, Footer, CartDrawer, Wordmark, Theme toggle, SmoothScroll, Cursor, Reveal
    product/      ProductPlate
    ui/           Button, Drawer, Toaster, primitives (Price, Tag, Skeleton, SectionHeading)
  lib/            api (browser client with silent token refresh), server-api, stores (auth, cart, toasts), delivery, flyToCart
  styles/         tokens.css, animations.css, globals.css
```

## Deploying behind proxies

Rate limits in the API are per client IP. If the site runs on Vercel and the API on Render, each
request passes through two proxies, so set `TRUST_PROXY=2` in the API's environment. Don't expose
the Next.js server directly to the internet without a proxy in front of it, or clients could set
their own `X-Forwarded-For`.
