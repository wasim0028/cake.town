import { beforeAll, describe, expect, it } from "vitest";
import { address, api, deliveryDate, seedCatalog, seedCustomCake, signupWeb } from "./helpers";

let data: Awaited<ReturnType<typeof seedCatalog>>;
let custom: Awaited<ReturnType<typeof seedCustomCake>>;
beforeAll(async () => {
  data = await seedCatalog();
  custom = await seedCustomCake(data.cakes._id);
});

const design = { shape: "heart", frosting: "chocolate-ganache", toppings: ["berries", "gold-leaf"] };

describe("cake builder", () => {
  it("prices a designed cake on the server: base + shape + frosting + toppings + eggless", async () => {
    const { agent } = await signupWeb();
    const res = await agent.post("/api/v1/cart/items").send({
      productId: String(custom._id),
      variantId: String(custom.variants[0]!._id),
      flavour: "Chocolate",
      eggless: true,
      message: "Happy 30th Riya",
      custom: design,
    });
    expect(res.status).toBe(201);
    // 1199 + heart 100 + ganache 50 + berries 90 + gold 150 + eggless 60 = 1649
    expect(res.body.cart.items[0]).toMatchObject({ unitPrice: 164900, custom: { shape: "heart", frosting: "chocolate-ganache" } });
  });

  it("requires choices for the builder cake and refuses them on other products", async () => {
    const { agent } = await signupWeb();
    const missing = await agent.post("/api/v1/cart/items").send({ productId: String(custom._id), variantId: String(custom.variants[0]!._id) });
    expect(missing.body.error.code).toBe("CUSTOMIZATION_REQUIRED");
    const wrong = await agent.post("/api/v1/cart/items").send({ productId: String(data.truffle._id), variantId: String(data.truffle.variants[0]!._id), custom: design });
    expect(wrong.body.error.code).toBe("NOT_CUSTOMIZABLE");
    const tooMany = await agent.post("/api/v1/cart/items").send({
      productId: String(custom._id),
      variantId: String(custom.variants[0]!._id),
      custom: { shape: "round", frosting: "fresh-cream", toppings: ["berries", "gold-leaf", "flowers", "macarons", "sprinkles"] },
    });
    expect(tooMany.status).toBe(422);
  });

  it("keeps the design on the order", async () => {
    const { agent } = await signupWeb();
    const addr = await agent.post("/api/v1/me/addresses").send(address);
    await agent.post("/api/v1/cart/items").send({ productId: String(custom._id), variantId: String(custom.variants[0]!._id), custom: design });
    const order = await agent.post("/api/v1/orders").send({ addressId: addr.body.address.id, deliveryDate: deliveryDate(3), deliverySlot: "16:00-19:00", paymentMethod: "cod" });
    expect(order.status).toBe(201);
    expect(order.body.order.items[0].customSummary).toBe("Heart · Chocolate ganache · Fresh berries, Edible gold leaf");
  });
});

describe("replace cart", () => {
  it("keeps valid lines, merges duplicates and reports rejected ones", async () => {
    const { agent } = await signupWeb();
    const v = String(data.cookie.variants[0]!._id);
    const res = await agent.put("/api/v1/cart").send({
      items: [
        { productId: String(data.cookie._id), variantId: v, quantity: 2 },
        { productId: String(data.cookie._id), variantId: v, quantity: 1 },
        { productId: String(data.hidden._id), variantId: String(data.hidden.variants[0]!._id) },
        { productId: "nope" },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.cart.items).toHaveLength(1);
    expect(res.body.cart.items[0].quantity).toBe(3);
    expect(res.body.rejected.map((r: { index: number }) => r.index)).toEqual([2, 3]);
  });
});

describe("latest reviews", () => {
  it("lists recent good reviews with the product name", async () => {
    const { agent } = await signupWeb({ name: "Meera Iyer" });
    await agent.post(`/api/v1/products/${data.cookie.slug}/reviews`).send({ rating: 5, comment: "Tastes like my grandmother's" });
    await agent.post(`/api/v1/products/${data.truffle.slug}/reviews`).send({ rating: 2, comment: "Too sweet" });
    const res = await api().get("/api/v1/reviews/latest");
    expect(res.body.items.map((r: { comment: string }) => r.comment)).toEqual(["Tastes like my grandmother's"]);
    expect(res.body.items[0]).toMatchObject({ user: { name: "Meera I." }, product: { name: "Nankhatai" } });
  });
});
