import { beforeAll, describe, expect, it } from "vitest";
import { Category, Product } from "../src/models";
import { flushBackground } from "../src/services/notify";
import { sentPush } from "../src/services/push";
import { address, api, deliveryDate, makeAdmin, seedCatalog, signupWeb } from "./helpers";

let data: Awaited<ReturnType<typeof seedCatalog>>;
beforeAll(async () => {
  data = await seedCatalog();
});

describe("admin lists", () => {
  it("are admin-only", async () => {
    const { agent } = await signupWeb();
    for (const path of ["/api/v1/admin/categories", "/api/v1/admin/reviews", "/api/v1/admin/messages"]) {
      expect((await agent.get(path)).status).toBe(403);
    }
  });

  it("lists every category, hidden ones too, with product counts", async () => {
    const { agent } = await makeAdmin();
    await Category.create({ name: "Seasonal", slug: "seasonal-hidden", isActive: false });
    const res = await agent.get("/api/v1/admin/categories");
    const slugs = res.body.items.map((c: { slug: string }) => c.slug);
    expect(slugs).toContain("seasonal-hidden");
    const cakes = res.body.items.find((c: { slug: string }) => c.slug === data.cakes.slug);
    expect(cakes.productCount).toBe(2); // truffle + hidden "Secret Cake"
  });

  it("filters products by status and category", async () => {
    const { agent } = await makeAdmin();
    await Product.updateOne({ _id: data.truffle._id, "variants._id": data.truffle.variants[1]!._id }, { $set: { "variants.$.stock": 0 } });
    const low = await agent.get("/api/v1/admin/products?status=low");
    expect(low.body.items.map((p: { name: string }) => p.name)).toContain("Chocolate Truffle Cake");
    expect(low.body.items.map((p: { name: string }) => p.name)).not.toContain("Nankhatai");
    const hidden = await agent.get("/api/v1/admin/products?status=hidden");
    expect(hidden.body.items.map((p: { name: string }) => p.name)).toEqual(["Secret Cake"]);
    const byCat = await agent.get(`/api/v1/admin/products?category=${data.cookies._id}`);
    expect(byCat.body.items.map((p: { name: string }) => p.name)).toEqual(["Nankhatai"]);
  });

  it("lists reviews and can hide one", async () => {
    const shopper = await signupWeb();
    await shopper.agent.post(`/api/v1/products/${data.cookie.slug}/reviews`).send({ rating: 1, comment: "spam spam" });
    const { agent } = await makeAdmin();
    const list = await agent.get("/api/v1/admin/reviews?rating=1");
    expect(list.body.items[0]).toMatchObject({ comment: "spam spam", isHidden: false, product: { name: "Nankhatai" } });
    await agent.patch(`/api/v1/admin/reviews/${list.body.items[0].id}`).send({ isHidden: true }).expect(200);
    const pub = await api().get(`/api/v1/products/${data.cookie.slug}/reviews`);
    expect(pub.body.total).toBe(0);
  });

  it("shows contact messages and marks them handled", async () => {
    await api().post("/api/v1/contact").send({ name: "Ravi", email: "ravi@example.com", message: "Do you make sugar-free cakes?" }).expect(201);
    const { agent } = await makeAdmin();
    const res = await agent.get("/api/v1/admin/messages?handled=false");
    expect(res.body.open).toBeGreaterThanOrEqual(1);
    const id = res.body.items[0].id;
    expect((await agent.patch(`/api/v1/admin/messages/${id}`).send({ handled: true })).body.message.handled).toBe(true);
  });

  it("lists customers with their order count and spend", async () => {
    const shopper = await signupWeb();
    const addr = await shopper.agent.post("/api/v1/me/addresses").send(address).expect(201);
    await shopper.agent.post("/api/v1/cart/items").send({ productId: String(data.cookie._id), variantId: String(data.cookie.variants[0]!._id), quantity: 2 }).expect(201);
    const order = await shopper.agent
      .post("/api/v1/orders")
      .send({ addressId: addr.body.address.id, deliveryDate: deliveryDate(), deliverySlot: "13:00-16:00", paymentMethod: "cod" })
      .expect(201);
    const { agent } = await makeAdmin();
    const res = await agent.get(`/api/v1/admin/users?q=${encodeURIComponent(shopper.user.email)}`);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ email: shopper.user.email, orders: 1, spent: order.body.order.total });
  });

  it("pushes new orders and messages to admin phones", async () => {
    const { user: admin } = await makeAdmin();
    const shopper = await signupWeb();
    const addr = await shopper.agent.post("/api/v1/me/addresses").send(address).expect(201);
    await shopper.agent.post("/api/v1/cart/items").send({ productId: String(data.cookie._id), variantId: String(data.cookie.variants[0]!._id) }).expect(201);
    const before = sentPush.length;
    const order = await shopper.agent
      .post("/api/v1/orders")
      .send({ addressId: addr.body.address.id, deliveryDate: deliveryDate(), deliverySlot: "10:00-13:00", paymentMethod: "cod" })
      .expect(201);
    await api().post("/api/v1/contact").send({ name: "Meena", email: "meena@example.com", message: "Do you deliver to Whitefield?" }).expect(201);
    await flushBackground();
    const toAdmin = sentPush.slice(before).filter((p) => p.userId === admin.id);
    expect(toAdmin.map((p) => p.payload.data)).toEqual(
      expect.arrayContaining([{ screen: "staff-order", id: order.body.order.id }, { screen: "staff-messages" }]),
    );
    expect(toAdmin.find((p) => p.payload.data?.screen === "staff-order")?.payload.title).toMatch(/^New order · ₹/);
    // The customer gets their own "Order placed" push, not the staff one.
    expect(sentPush.slice(before).some((p) => p.userId === shopper.user.id && p.payload.data?.screen === "order")).toBe(true);
  });
});
