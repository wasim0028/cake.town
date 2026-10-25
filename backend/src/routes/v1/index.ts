import { Router } from "express";
import multer from "multer";
import * as admin from "../../controllers/admin.controller";
import * as auth from "../../controllers/auth.controller";
import * as catalog from "../../controllers/catalog.controller";
import * as classes from "../../controllers/classes.controller";
import * as commerce from "../../controllers/commerce.controller";
import * as misc from "../../controllers/misc.controller";
import { optionalAuth, requireAdmin, requireAuth } from "../../middleware/auth";
import { authLimiter, checkoutLimiter, formLimiter, otpLimiter } from "../../middleware/rateLimit";
import { badRequest } from "../../utils/errors";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|avif|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(badRequest("Only JPG, PNG, WebP, AVIF or GIF images are allowed", "BAD_FILE_TYPE"));
  },
});

export const v1 = Router();

/* ---------- auth ---------- */
const a = Router();
a.post("/signup", authLimiter, auth.signup);
a.post("/login", authLimiter, auth.login);
a.post("/refresh", auth.refresh);
a.post("/logout", auth.logout);
a.post("/logout-all", requireAuth, auth.logoutAll);
a.get("/me", requireAuth, auth.me);
a.patch("/me", requireAuth, auth.updateMe);
a.post("/change-password", requireAuth, authLimiter, auth.changePassword);
a.post("/forgot-password", authLimiter, auth.forgotPassword);
a.post("/reset-password", authLimiter, auth.resetPassword);
a.post("/otp/request", otpLimiter, auth.requestOtp);
a.post("/otp/verify", authLimiter, auth.verifyOtp);
v1.use("/auth", a);

/* ---------- catalogue (public) ---------- */
v1.get("/categories", catalog.listCategories);
v1.get("/products", catalog.listProducts);
v1.get("/reviews/latest", catalog.latestReviews);
v1.get("/products/:slug", catalog.getProduct);
v1.get("/products/:slug/related", catalog.relatedProducts);
v1.get("/products/:slug/reviews", catalog.listReviews);
v1.post("/products/:slug/reviews", requireAuth, catalog.upsertReview);
v1.delete("/products/:slug/reviews/mine", requireAuth, catalog.deleteMyReview);

/* ---------- cart & checkout ---------- */
const cart = Router();
cart.use(requireAuth);
cart.get("/", commerce.getCart);
cart.post("/items", commerce.addCartItem);
cart.put("/", commerce.replaceCart);
cart.patch("/items/:itemId", commerce.updateCartItem);
cart.delete("/items/:itemId", commerce.removeCartItem);
cart.delete("/", commerce.clearCart);
v1.use("/cart", cart);

v1.post("/checkout/quote", requireAuth, commerce.quote);

/* ---------- orders ---------- */
const orders = Router();
orders.use(requireAuth);
orders.post("/", checkoutLimiter, commerce.checkout);
orders.get("/", commerce.listMyOrders);
orders.get("/:id", commerce.getMyOrder);
orders.post("/:id/cancel", commerce.cancelMyOrder);
orders.post("/:id/reorder", commerce.reorder);
v1.use("/orders", orders);

/* ---------- payments ---------- */
// The webhook route is mounted in app.ts with a raw body parser (signature needs the exact bytes).
v1.post("/payments/razorpay/verify", requireAuth, commerce.verifyPayment);

/* ---------- account ---------- */
const me = Router();
me.use(requireAuth);
me.get("/addresses", commerce.listAddresses);
me.post("/addresses", commerce.createAddress);
me.patch("/addresses/:id", commerce.updateAddress);
me.delete("/addresses/:id", commerce.deleteAddress);
me.get("/wishlist", commerce.getWishlist);
me.put("/wishlist/:productId", commerce.addToWishlist);
me.delete("/wishlist/:productId", commerce.removeFromWishlist);
me.get("/bookings", classes.listMyBookings);
me.post("/devices", misc.registerDevice);
me.delete("/devices/:token", misc.unregisterDevice);
v1.use("/me", me);

/* ---------- baking classes ---------- */
v1.get("/classes", classes.listClasses);
v1.get("/classes/:slug", classes.getClass);
v1.post("/bookings", requireAuth, checkoutLimiter, classes.bookClass);
v1.post("/bookings/:id/cancel", requireAuth, classes.cancelMyBooking);

/* ---------- misc ---------- */
v1.get("/config", misc.publicConfig);
v1.post("/contact", formLimiter, optionalAuth, misc.contact);
v1.post("/newsletter", formLimiter, misc.subscribe);

/* ---------- admin ---------- */
const ad = Router();
ad.use(requireAdmin);
ad.get("/stats", admin.stats);

ad.get("/orders", admin.listOrders);
ad.get("/orders/:id", admin.getOrder);
ad.patch("/orders/:id/status", admin.updateOrderStatus);
ad.post("/orders/:id/refund", admin.refundOrder);

ad.get("/products", catalog.adminListProducts);
ad.get("/products/:id", catalog.adminGetProduct);
ad.post("/products", catalog.createProduct);
ad.patch("/products/:id", catalog.updateProduct);
ad.delete("/products/:id", catalog.deleteProduct);

ad.post("/categories", catalog.createCategory);
ad.patch("/categories/:id", catalog.updateCategory);
ad.delete("/categories/:id", catalog.deleteCategory);

ad.patch("/reviews/:id", catalog.moderateReview);

ad.get("/classes", classes.adminListClasses);
ad.post("/classes", classes.createClass);
ad.patch("/classes/:id", classes.updateClass);
ad.delete("/classes/:id", classes.deleteClass);
ad.get("/bookings", classes.adminListBookings);
ad.post("/bookings/:id/cancel", classes.adminCancelBooking);

ad.get("/coupons", admin.listCoupons);
ad.post("/coupons", admin.createCoupon);
ad.patch("/coupons/:id", admin.updateCoupon);
ad.delete("/coupons/:id", admin.deleteCoupon);

ad.get("/users", admin.listUsers);
ad.patch("/users/:id/role", admin.updateUserRole);

ad.post("/uploads", upload.array("images", 6), misc.uploadImages);
ad.delete("/uploads", misc.deleteImage);
v1.use("/admin", ad);
