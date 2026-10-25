import { beforeAll, describe, expect, it } from "vitest";
import { api, makeAdmin, seedCatalog, signupWeb } from "./helpers";

let data: Awaited<ReturnType<typeof seedCatalog>>;

beforeAll(async () => {
  data = await seedCatalog();
});

describe("public catalogue", () => {
  it("lists active products only, with prices in paise and no stock numbers", async () => {
    const res = await api().get("/api/v1/products");
    expect(res.status).toBe(200);
    const names = res.body.items.map((p: { name: string }) => p.name);
    expect(names).toContain("Chocolate Truffle Cake");
    expect(names).not.toContain("Secret Cake");
    const truffle = res.body.items.find((p: { name: string }) => p.name === "Chocolate Truffle Cake");
    expect(truffle.priceFrom).toBe(54900);
    expect(truffle.variants[0]).toMatchObject({ label: "0.5 kg", price: 54900, inStock: true });
    expect(truffle.variants[0].stock).toBeUndefined();
    expect(res.body).toMatchObject({ page: 1, total: 2 });
  });

  it("filters by category, dietary tag and price, and sorts", async () => {
    const byCat = await api().get(`/api/v1/products?category=${data.cookies.slug}`);
    expect(byCat.body.items.map((p: { name: string }) => p.name)).toEqual(["Nankhatai"]);

    // Nankhatai is eggless; the truffle cake can be made eggless on request.
    const eggless = await api().get("/api/v1/products?dietary=eggless");
    expect(eggless.body.items.map((p: { name: string }) => p.name).sort()).toEqual(["Chocolate Truffle Cake", "Nankhatai"]);

    const cheap = await api().get("/api/v1/products?maxPrice=30000");
    expect(cheap.body.items.map((p: { name: string }) => p.name)).toEqual(["Nankhatai"]);

    const sorted = await api().get("/api/v1/products?sort=price_desc");
    expect(sorted.body.items[0].name).toBe("Chocolate Truffle Cake");

    const unknown = await api().get("/api/v1/products?category=does-not-exist");
    expect(unknown.body.items).toHaveLength(0);
  });

  it("searches by text", async () => {
    const res = await api().get("/api/v1/products?q=chocolate");
    expect(res.body.items.map((p: { name: string }) => p.name)).toEqual(["Chocolate Truffle Cake"]);
  });

  it("rejects bad query values", async () => {
    const res = await api().get("/api/v1/products?sort=cheapest");
    expect(res.status).toBe(422);
  });

  it("returns a product by slug, 404 for hidden ones", async () => {
    expect((await api().get(`/api/v1/products/${data.truffle.slug}`)).status).toBe(200);
    expect((await api().get(`/api/v1/products/${data.hidden.slug}`)).status).toBe(404);
  });

  it("lists categories with product counts", async () => {
    const res = await api().get("/api/v1/categories");
    const cakes = res.body.items.find((c: { slug: string }) => c.slug === data.cakes.slug);
    expect(cakes.productCount).toBe(1);
  });
});

describe("reviews", () => {
  it("lets a customer review and updates the rating", async () => {
    const { agent } = await signupWeb({ name: "Rohan Gupta" });
    const res = await agent.post(`/api/v1/products/${data.cookie.slug}/reviews`).send({ rating: 4, comment: "Lovely with chai" });
    expect(res.status).toBe(201);
    expect(res.body.review.verifiedPurchase).toBe(false);
    // Upsert: a second review replaces the first.
    await agent.post(`/api/v1/products/${data.cookie.slug}/reviews`).send({ rating: 5 });

    const list = await api().get(`/api/v1/products/${data.cookie.slug}/reviews`);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0].user.name).toBe("Rohan G.");

    const product = await api().get(`/api/v1/products/${data.cookie.slug}`);
    expect(product.body.product.rating).toEqual({ average: 5, count: 1 });
  });
});

describe("admin catalogue", () => {
  it("blocks customers", async () => {
    const { agent } = await signupWeb();
    const res = await agent.get("/api/v1/admin/products");
    expect(res.status).toBe(403);
  });

  it("creates and edits products, and the public cache updates", async () => {
    const { agent } = await makeAdmin();
    const created = await agent.post("/api/v1/admin/products").send({
      name: "Pistachio Rose Cake",
      category: String(data.cakes._id),
      variants: [{ label: "1 kg", price: 129900, stock: 7 }],
      tags: ["pistachio"],
    });
    expect(created.status).toBe(201);
    expect(created.body.product).toMatchObject({ slug: "pistachio-rose-cake", priceFrom: 129900 });
    expect(created.body.product.variants[0].stock).toBe(7);

    const before = await api().get("/api/v1/products/pistachio-rose-cake");
    expect(before.body.product.priceFrom).toBe(129900);

    const variantId = created.body.product.variants[0].id;
    const edited = await agent
      .patch(`/api/v1/admin/products/${created.body.product.id}`)
      .send({ variants: [{ id: variantId, label: "1 kg", price: 119900, stock: 7 }] });
    expect(edited.status).toBe(200);
    expect(edited.body.product.variants[0].id).toBe(variantId); // ids kept, carts keep working

    const after = await api().get("/api/v1/products/pistachio-rose-cake");
    expect(after.body.product.priceFrom).toBe(119900);
  });

  it("PATCH only changes the fields that were sent", async () => {
    const { agent } = await makeAdmin();
    const res = await agent.patch(`/api/v1/admin/products/${data.cookie._id}`).send({ isBestseller: true });
    expect(res.status).toBe(200);
    expect(res.body.product).toMatchObject({ isBestseller: true, dietary: ["eggless"], preparationHours: 1, isActive: true });

    const shopper = await signupWeb();
    const a = await shopper.agent.post("/api/v1/me/addresses").send({ fullName: "Asha", phone: "9876543210", line1: "1 Lane", city: "Pune", state: "MH", pincode: "411001" });
    const edited = await shopper.agent.patch(`/api/v1/me/addresses/${a.body.address.id}`).send({ line2: "Flat 4" });
    expect(edited.body.address).toMatchObject({ isDefault: true, label: "Home", line2: "Flat 4" });
  });

  it("validates admin input", async () => {
    const { agent } = await makeAdmin();
    const res = await agent.post("/api/v1/admin/products").send({ name: "X", category: "nope", variants: [] });
    expect(res.status).toBe(422);
  });

  it("explains that uploads need Cloudinary keys", async () => {
    const { agent } = await makeAdmin();
    const res = await agent.post("/api/v1/admin/uploads").attach("images", Buffer.from("fakepng"), { filename: "a.png", contentType: "image/png" });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("UPLOADS_DISABLED");
  });
});
