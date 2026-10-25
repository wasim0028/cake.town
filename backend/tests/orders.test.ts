import crypto from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Coupon, Order, Product } from "../src/models";
import { sentEmails } from "../src/services/email";
import { flushBackground } from "../src/services/notify";
import { expireUnpaidOrders } from "../src/services/orders";
import { sentPush } from "../src/services/push";
import { address, api, deliveryDate, makeAdmin, seedCatalog, seedCoupon, signupWeb } from "./helpers";

// Razorpay's network calls are mocked; signatures are verified for real.
vi.mock("../src/services/razorpay", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/services/razorpay")>();
  return {
    ...actual,
    createRazorpayOrder: vi.fn(async (amount: number) => ({ id: `order_${crypto.randomBytes(6).toString("hex")}`, amount, currency: "INR" })),
    fetchPayment: vi.fn(),
    refundPayment: vi.fn(async () => ({ id: "rfnd_test", amount: 0 })),
  };
});
const razorpay = await import("../src/services/razorpay");

let data: Awaited<ReturnType<typeof seedCatalog>>;
beforeAll(async () => {
  data = await seedCatalog();
});

async function shopper() {
  const s = await signupWeb();
  const addr = await s.agent.post("/api/v1/me/addresses").send(address);
  expect(addr.status).toBe(201);
  expect(addr.body.address.isDefault).toBe(true); // first address becomes default
  return { ...s, addressId: addr.body.address.id as string };
}

const variant = (i: number) => String(data.truffle.variants[i]!._id);
async function stockOf(i: number) {
  const p = await Product.findById(data.truffle._id).lean();
  return p!.variants[i]!.stock;
}

describe("cart", () => {
  it("adds items, merges identical lines and prices eggless", async () => {
    const { agent } = await shopper();
    await agent.post("/api/v1/cart/items").send({ productId: String(data.truffle._id), variantId: variant(0), quantity: 1, eggless: true, message: "Happy Birthday Ma" }).expect(201);
    const res = await agent.post("/api/v1/cart/items").send({ productId: String(data.truffle._id), variantId: variant(0), quantity: 1, eggless: true, message: "Happy Birthday Ma" });
    expect(res.body.cart.items).toHaveLength(1);
    expect(res.body.cart.items[0]).toMatchObject({ quantity: 2, unitPrice: 54900 + 6000, lineTotal: 2 * 60900 });
    expect(res.body.cart.subtotal).toBe(121800);
  });

  it("refuses more than the stock", async () => {
    const { agent } = await shopper();
    const res = await agent.post("/api/v1/cart/items").send({ productId: String(data.truffle._id), variantId: variant(1), quantity: 2 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("OUT_OF_STOCK");
  });

  it("rejects options the product doesn't offer", async () => {
    const { agent } = await shopper();
    const res = await agent.post("/api/v1/cart/items").send({ productId: String(data.cookie._id), variantId: String(data.cookie.variants[0]!._id), message: "hi" });
    expect(res.status).toBe(400);
  });
});

describe("cash on delivery checkout", () => {
  it("places an order: stock down, cart cleared, coupon used, notifications sent", async () => {
    const { agent, addressId, user } = await shopper();
    const coupon = await seedCoupon({ value: 10, maxDiscount: 5000 });
    const stockBefore = await stockOf(0);

    await agent.post("/api/v1/cart/items").send({ productId: String(data.truffle._id), variantId: variant(0), quantity: 2 }).expect(201);

    const quote = await agent.post("/api/v1/checkout/quote").send({ couponCode: coupon.code.toLowerCase() });
    expect(quote.body.quote).toMatchObject({ subtotal: 109800, discount: 5000, deliveryFee: 0, total: 104800 });

    const emailsBefore = sentEmails.length;
    const res = await agent.post("/api/v1/orders").send({
      addressId,
      deliveryDate: deliveryDate(),
      deliverySlot: "16:00-19:00",
      paymentMethod: "cod",
      couponCode: coupon.code,
    });
    expect(res.status).toBe(201);
    const order = res.body.order;
    expect(order.orderNumber).toMatch(/^CT-\d{6}-[A-Z0-9]{5}$/);
    expect(order).toMatchObject({ status: "placed", paymentStatus: "pending", total: 104800, discount: 5000 });
    // Snapshot of name, price and address.
    expect(order.items[0]).toMatchObject({ name: "Chocolate Truffle Cake", variantLabel: "0.5 kg", unitPrice: 54900, quantity: 2 });
    expect(order.address.phone).toBe("9830012345");

    expect(await stockOf(0)).toBe(stockBefore - 2);
    expect((await agent.get("/api/v1/cart")).body.cart.items).toHaveLength(0);
    expect((await Coupon.findById(coupon._id))!.usedCount).toBe(1);

    await flushBackground();
    const mails = sentEmails.slice(emailsBefore);
    expect(mails.some((m) => m.to === user.email && /Order confirmed/.test(m.subject))).toBe(true);
    expect(mails.some((m) => m.to === "shop@caketown.test")).toBe(true);
    expect(sentPush.some((p) => p.userId === user.id)).toBe(true);

    // Coupon is one per customer.
    await agent.post("/api/v1/cart/items").send({ productId: String(data.cookie._id), variantId: String(data.cookie.variants[0]!._id) });
    const again = await agent.post("/api/v1/checkout/quote").send({ couponCode: coupon.code });
    expect(again.body.quote.couponError).toBe("You've already used this code");
  });

  it("rejects a delivery slot sooner than the preparation time", async () => {
    const { agent, addressId } = await shopper();
    await agent.post("/api/v1/cart/items").send({ productId: String(data.truffle._id), variantId: variant(0) });
    const res = await agent.post("/api/v1/orders").send({
      addressId,
      deliveryDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(Date.now() - 86400_000)),
      deliverySlot: "10:00-13:00",
      paymentMethod: "cod",
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("DELIVERY_SLOT_UNAVAILABLE");
  });

  it("only one of two shoppers gets the last cake", async () => {
    const a = await shopper();
    const b = await shopper();
    await Product.updateOne({ _id: data.truffle._id, "variants._id": variant(1) }, { $set: { "variants.$.stock": 1 } });
    for (const s of [a, b]) await s.agent.post("/api/v1/cart/items").send({ productId: String(data.truffle._id), variantId: variant(1) }).expect(201);

    const body = (id: string) => ({ addressId: id, deliveryDate: deliveryDate(), deliverySlot: "10:00-13:00", paymentMethod: "cod" });
    const results = await Promise.all([a.agent.post("/api/v1/orders").send(body(a.addressId)), b.agent.post("/api/v1/orders").send(body(b.addressId))]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409]);
    expect(await stockOf(1)).toBe(0);
  });

  it("customer cancel puts stock back; admin moves the order along", async () => {
    const { agent, addressId } = await shopper();
    await Product.updateOne({ _id: data.truffle._id, "variants._id": variant(0) }, { $set: { "variants.$.stock": 5 } });
    await agent.post("/api/v1/cart/items").send({ productId: String(data.truffle._id), variantId: variant(0), quantity: 3 });
    const placed = await agent.post("/api/v1/orders").send({ addressId, deliveryDate: deliveryDate(), deliverySlot: "19:00-22:00", paymentMethod: "cod" });
    expect(await stockOf(0)).toBe(2);

    const cancelled = await agent.post(`/api/v1/orders/${placed.body.order.id}/cancel`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.order.status).toBe("cancelled");
    expect(await stockOf(0)).toBe(5);

    // A second order goes through the admin flow.
    await agent.post("/api/v1/cart/items").send({ productId: String(data.truffle._id), variantId: variant(0) });
    const second = await agent.post("/api/v1/orders").send({ addressId, deliveryDate: deliveryDate(), deliverySlot: "19:00-22:00", paymentMethod: "cod" });
    const id = second.body.order.id;
    const { agent: admin } = await makeAdmin();

    const skip = await admin.patch(`/api/v1/admin/orders/${id}/status`).send({ status: "delivered" });
    expect(skip.status).toBe(422);
    expect(skip.body.error.code).toBe("INVALID_TRANSITION");

    for (const status of ["baking", "out_for_delivery", "delivered"]) {
      const r = await admin.patch(`/api/v1/admin/orders/${id}/status`).send({ status });
      expect(r.status).toBe(200);
    }
    const final = await agent.get(`/api/v1/orders/${id}`);
    expect(final.body.order).toMatchObject({ status: "delivered", paymentStatus: "paid" }); // COD collected
    expect(final.body.order.statusHistory.map((h: { status: string }) => h.status)).toEqual(["placed", "baking", "out_for_delivery", "delivered"]);

    // Too late for the customer to cancel now.
    expect((await agent.post(`/api/v1/orders/${id}/cancel`)).status).toBe(409);

    // A delivered purchase makes the review "verified".
    const review = await agent.post(`/api/v1/products/${data.truffle.slug}/reviews`).send({ rating: 5 });
    expect(review.body.review.verifiedPurchase).toBe(true);
  });

  it("other customers can't see your order", async () => {
    const owner = await shopper();
    await owner.agent.post("/api/v1/cart/items").send({ productId: String(data.cookie._id), variantId: String(data.cookie.variants[0]!._id) });
    const placed = await owner.agent.post("/api/v1/orders").send({ addressId: owner.addressId, deliveryDate: deliveryDate(), deliverySlot: "10:00-13:00", paymentMethod: "cod" });
    const stranger = await signupWeb();
    expect((await stranger.agent.get(`/api/v1/orders/${placed.body.order.id}`)).status).toBe(404);
  });
});

describe("Razorpay checkout", () => {
  beforeEach(() => vi.mocked(razorpay.fetchPayment).mockReset());

  async function onlineOrder() {
    const s = await shopper();
    await s.agent.post("/api/v1/cart/items").send({ productId: String(data.cookie._id), variantId: String(data.cookie.variants[0]!._id), quantity: 2 });
    const res = await s.agent.post("/api/v1/orders").send({ addressId: s.addressId, deliveryDate: deliveryDate(), deliverySlot: "13:00-16:00", paymentMethod: "razorpay" });
    expect(res.status).toBe(201);
    return { ...s, order: res.body.order, rp: res.body.razorpay };
  }

  function webhook(body: object, secret = "whsec_test", eventId = crypto.randomUUID()) {
    const raw = JSON.stringify(body);
    const signature = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    return api()
      .post("/api/v1/payments/razorpay/webhook")
      .set("Content-Type", "application/json")
      .set("X-Razorpay-Signature", signature)
      .set("X-Razorpay-Event-Id", eventId)
      .send(raw);
  }

  it("creates a pending order with Razorpay checkout details (amount set by the server)", async () => {
    const { order, rp } = await onlineOrder();
    expect(order).toMatchObject({ status: "pending_payment", paymentStatus: "pending" });
    // 2 × ₹199 = ₹398 + ₹49 delivery (below ₹999)
    expect(rp).toMatchObject({ keyId: "rzp_test_dummy", amount: 39800 + 4900, currency: "INR" });
  });

  it("marks the order paid only when a correctly signed webhook arrives, once", async () => {
    const { order, rp, user } = await onlineOrder();
    const event = { event: "payment.captured", payload: { payment: { entity: { id: "pay_123", order_id: rp.orderId, status: "captured" } } } };

    const forged = await webhook(event, "wrong-secret");
    expect(forged.status).toBe(400);
    expect((await Order.findById(order.id))!.status).toBe("pending_payment");

    const eventId = crypto.randomUUID();
    expect((await webhook(event, undefined, eventId)).status).toBe(200);
    const paid = await Order.findById(order.id);
    expect(paid).toMatchObject({ status: "placed", paymentStatus: "paid" });
    expect(paid!.razorpay?.paymentId).toBe("pay_123");

    // Razorpay retries: ignored.
    expect((await webhook(event, undefined, eventId)).status).toBe(200);
    expect((await Order.findById(order.id))!.statusHistory).toHaveLength(2);

    await flushBackground();
    expect(sentEmails.some((m) => m.to === user.email && /Order confirmed/.test(m.subject))).toBe(true);
  });

  it("client verify checks the signature and asks Razorpay for the real status", async () => {
    const { agent, order, rp } = await onlineOrder();
    const sig = (o: string, p: string) => crypto.createHmac("sha256", "rzp_test_secret").update(`${o}|${p}`).digest("hex");

    const bad = await agent.post("/api/v1/payments/razorpay/verify").send({ razorpayOrderId: rp.orderId, razorpayPaymentId: "pay_x1", razorpaySignature: "deadbeefdeadbeef" });
    expect(bad.status).toBe(400);

    vi.mocked(razorpay.fetchPayment).mockResolvedValueOnce({ id: "pay_x1", order_id: rp.orderId, status: "captured" } as never);
    const ok = await agent.post("/api/v1/payments/razorpay/verify").send({ razorpayOrderId: rp.orderId, razorpayPaymentId: "pay_x1", razorpaySignature: sig(rp.orderId, "pay_x1") });
    expect(ok.body.status).toBe("paid");
    expect((await Order.findById(order.id))!.status).toBe("placed");
  });

  it("expires unpaid orders and releases their stock", async () => {
    const stockBefore = (await Product.findById(data.cookie._id).lean())!.variants[0]!.stock;
    const { order } = await onlineOrder();
    expect((await Product.findById(data.cookie._id).lean())!.variants[0]!.stock).toBe(stockBefore - 2);

    await Order.updateOne({ _id: order.id }, { $set: { paymentExpiresAt: new Date(Date.now() - 1000) } });
    expect(await expireUnpaidOrders()).toBeGreaterThanOrEqual(1);
    expect((await Order.findById(order.id))!.status).toBe("cancelled");
    expect((await Product.findById(data.cookie._id).lean())!.variants[0]!.stock).toBe(stockBefore);
  });

  it("refunds a payment that arrives after the order expired", async () => {
    const { order, rp } = await onlineOrder();
    await Order.updateOne({ _id: order.id }, { $set: { paymentExpiresAt: new Date(Date.now() - 1000) } });
    await expireUnpaidOrders();
    await webhook({ event: "payment.captured", payload: { payment: { entity: { id: "pay_late", order_id: rp.orderId, status: "captured" } } } }).expect(200);
    expect(vi.mocked(razorpay.refundPayment)).toHaveBeenCalledWith("pay_late", undefined, expect.any(String));
    expect((await Order.findById(order.id))!.paymentStatus).toBe("refunded");
  });
});

describe("admin dashboard", () => {
  it("returns sales stats", async () => {
    const { agent } = await makeAdmin();
    const res = await agent.get("/api/v1/admin/stats");
    expect(res.status).toBe(200);
    expect(res.body.revenueSeries).toHaveLength(30);
    expect(res.body.sales.last30Days.orders).toBeGreaterThan(0);
    expect(Array.isArray(res.body.lowStock)).toBe(true);
  });
});
