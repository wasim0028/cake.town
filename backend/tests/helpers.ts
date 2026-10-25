import request from "supertest";
import { createApp } from "../src/app";
import { BakingClass, Category, Coupon, Product, User } from "../src/models";

export const app = createApp();
export const api = () => request(app);

let n = 0;
const unique = () => `${Date.now().toString(36)}${(n++).toString(36)}`;

/** Signs up through the API and returns a supertest agent that keeps the auth cookies. */
export async function signupWeb(overrides: Partial<{ name: string; email: string; phone: string; password: string }> = {}) {
  const agent = request.agent(app);
  const body = {
    name: "Priya Sharma",
    email: `priya.${unique()}@example.com`,
    phone: `98${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`,
    password: "Cakes1234",
    confirmPassword: overrides.password ?? "Cakes1234",
    ...overrides,
  };
  const res = await agent.post("/api/v1/auth/signup").send(body);
  if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, user: res.body.user as { id: string; email: string }, credentials: body };
}

/** Signs up as a mobile client and returns bearer tokens. */
export async function signupMobile() {
  const body = {
    name: "Rahul Das",
    email: `rahul.${unique()}@example.com`,
    phone: "9876543210",
    password: "Cakes1234",
    confirmPassword: "Cakes1234",
  };
  const res = await api().post("/api/v1/auth/signup").set("X-Client", "mobile").send(body);
  if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { accessToken: res.body.accessToken as string, refreshToken: res.body.refreshToken as string, user: res.body.user };
}

export async function makeAdmin() {
  const session = await signupWeb({ name: "Admin" });
  await User.updateOne({ _id: session.user.id }, { $set: { role: "admin" } });
  return session;
}

export async function seedCatalog() {
  const cakes = await Category.create({ name: "Cakes", slug: `cakes-${unique()}` });
  const cookies = await Category.create({ name: "Cookies", slug: `cookies-${unique()}` });
  const truffle = await new Product({
    name: "Chocolate Truffle Cake",
    slug: `chocolate-truffle-${unique()}`,
    description: "Rich dark chocolate truffle",
    category: cakes._id,
    variants: [
      { label: "0.5 kg", price: 54900, stock: 5 },
      { label: "1 kg", price: 99900, stock: 1 },
    ],
    flavours: [],
    egglessOption: { available: true, extraPrice: 6000 },
    allowsMessage: true,
    maxMessageLength: 30,
    preparationHours: 4,
    tags: ["chocolate"],
    isBestseller: true,
  }).save();
  const cookie = await new Product({
    name: "Nankhatai",
    slug: `nankhatai-${unique()}`,
    description: "Cardamom shortbread",
    category: cookies._id,
    variants: [{ label: "250 g", price: 19900, stock: 50 }],
    dietary: ["eggless"],
    preparationHours: 1,
  }).save();
  const hidden = await new Product({
    name: "Secret Cake",
    slug: `secret-${unique()}`,
    category: cakes._id,
    variants: [{ label: "1 kg", price: 100000, stock: 10 }],
    isActive: false,
  }).save();
  return { cakes, cookies, truffle, cookie, hidden };
}

export async function seedCoupon(over: Record<string, unknown> = {}) {
  return Coupon.create({ code: `SAVE${unique().toUpperCase().slice(-6)}`, type: "percent", value: 10, minOrder: 0, perUserLimit: 1, ...over });
}

export async function seedClass() {
  const startsAt = new Date(Date.now() + 5 * 24 * 3600_000);
  return BakingClass.create({
    title: "Cake Decorating Basics",
    slug: `decorating-${unique()}`,
    instructor: { name: "Ananya" },
    durationMinutes: 180,
    price: 249900,
    sessions: [{ startsAt, seats: 3 }],
  });
}

/** A delivery date 3 days from now in YYYY-MM-DD (always far enough ahead for prep time). */
export function deliveryDate(daysAhead = 3) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(Date.now() + daysAhead * 24 * 3600_000));
}

export const address = {
  label: "Home",
  fullName: "Priya Sharma",
  phone: "+91 98300 12345",
  line1: "12 MG Road",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560001",
};
