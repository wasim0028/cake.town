# caketown app (Android & iPhone)

Expo SDK 58 · React Native 0.88 · Expo Router · TypeScript. Uses the same API, design and
`@caketown/shared` rules as the website, so prices, delivery slots and the cake designer always agree.

## Run it

```bash
# from the repo root, with the API running (npm run dev:api)
cp mobile/.env.example mobile/.env.local   # set EXPO_PUBLIC_API_URL (see the comments in the file)
npm run dev:mobile                          # scan the QR code with Expo Go, or press a / i for an emulator
```

A real phone can't reach `localhost` on your computer: use your computer's Wi-Fi IP address
(e.g. `http://192.168.1.20:5000`) and add nothing else; the API accepts app requests from any origin.

## Screens

| | |
|---|---|
| Splash | The truffle cake drops onto its plate, the wordmark rises |
| Onboarding | Three slides (first launch only), plates roll in with parallax, animated page dots |
| Home | Live next delivery slot, auto-advancing banners, categories, bestsellers, next baking class, pull to refresh |
| Menu | Search, categories, eggless and sort chips, two-column infinite list, skeletons |
| Product | Parallax plate header, sizes, flavour, eggless, message, quantity, reviews, related, sticky "Add to cart" |
| Design a cake | Six steps with a live drawing (round, square, heart) and a counting price |
| Cart | Swipe left to remove (with haptic), steppers, free-delivery meter |
| Sign in | Email + password, sign up, or one-time SMS code |
| Checkout | Saved addresses, day and slot picker that respects baking time, coupon, cash on delivery or Razorpay |
| Order | Live timeline that refreshes every 30 s, cancel, order again |
| Classes | Class list, dates with seats left, booking (pay at the studio or online) |
| Account | Current order, orders, favourites, addresses, class bookings, settings (theme, notifications) |

### Staff (admin accounts only)

Admins see a **Staff** card at the top of Account. Everyone else never sees these screens, and the
API refuses them anyway.

| | |
|---|---|
| Today | New orders to start, deliveries today, sales today and this week, orders waiting, running low |
| Orders | New / Baking / Out for delivery / Delivered / All, search, infinite list, refreshes every 30 s |
| Order | Delivery day and slot, "collect cash" reminder, one big button for the next step (start baking → send out → delivered), note for the customer, cancel, items with cake messages, call and map buttons, history |
| Kitchen list | Day by day: everything to bake added up, then each order by delivery slot |
| Stock | Running low / all / hidden, +10 and steppers per size, show or hide a product |
| Messages | Contact form inbox: email or call back, mark handled |

New orders and contact messages arrive as push notifications on every phone signed in to an admin
account; tapping one opens that order or the inbox. With the app open, a new order also shows a toast.
Products, coupons, classes and customers are edited on the website at `/admin`.

## How it works

- **Sign-in:** the API returns tokens to the app (`X-Client: mobile`). The refresh token is stored in
  the phone's keychain (SecureStore); the 15-minute access token only in memory, refreshed silently.
- **Cart:** kept on the phone; at checkout it's copied to the account and priced by the server.
- **Payments:** Razorpay Checkout opens inside the app in a web view, so it works in Expo Go and in
  store builds without extra native setup. The API confirms the payment with Razorpay before the
  order counts as paid.
- **Push notifications:** after sign-in the app registers its Expo push token with the API, which sends
  a notification on every order status change. Tapping it opens that order. Admin phones also get
  "New order" and "Message from…" notifications. This needs a physical
  phone and an EAS project id (`npx eas init` adds it to `app.json`).
- **Haptics:** light taps on choices, a firmer one on "Add to cart", success/warning on results.
- **Dark mode:** follows the phone, or choose Light/Dark in Settings.

## Build for the stores

```bash
npm i -g eas-cli
cd mobile
eas init                      # links the project and enables push notifications
eas build -p android --profile preview      # installable APK for testing
eas build -p all --profile production       # Play Store / App Store builds
eas submit -p android|ios
```

Set the production API address in `eas.json` (`EXPO_PUBLIC_API_URL`). App id: `com.caketown.app`.
