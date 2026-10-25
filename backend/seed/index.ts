/**
 * Seeds categories, products, coupons, baking classes and an admin user.
 *
 *   npm run seed            add anything missing (safe to run again; keeps your edits)
 *   npm run seed -- --reset wipe catalogue, coupons and classes first (NOT users or orders)
 */
import crypto from "node:crypto";
import { connectDb, disconnectDb } from "../src/config/db";
import { env } from "../src/config/env";
import { BakingClass, Category, Coupon, Product, User, slugify } from "../src/models";
import { categories, classes, coupons, products } from "./data";

const reset = process.argv.includes("--reset");

/** Next `count` Saturdays and Sundays at the given IST hour. */
function upcomingWeekendSessions(hourIST: number, count: number, seats: number) {
  const sessions: { startsAt: Date; seats: number }[] = [];
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  while (sessions.length < count) {
    day.setUTCDate(day.getUTCDate() + 1);
    const dow = day.getUTCDay();
    if (dow === 0 || dow === 6) {
      const ymd = day.toISOString().slice(0, 10);
      sessions.push({ startsAt: new Date(`${ymd}T${String(hourIST).padStart(2, "0")}:00:00+05:30`), seats });
    }
  }
  return sessions;
}

async function main() {
  await connectDb();

  if (reset) {
    await Promise.all([Category.deleteMany({}), Product.deleteMany({}), Coupon.deleteMany({}), BakingClass.deleteMany({})]);
    console.log("Reset: catalogue, coupons and classes cleared");
  }

  const catIds = new Map<string, unknown>();
  for (const c of categories) {
    const doc = await Category.findOneAndUpdate({ slug: c.slug }, { $setOnInsert: c }, { upsert: true, new: true });
    catIds.set(c.slug, doc._id);
  }
  console.log(`✔ ${categories.length} categories`);

  let created = 0;
  for (const p of products) {
    const slug = slugify(p.name);
    if (await Product.exists({ slug })) continue;
    await new Product({
      ...p,
      slug,
      category: catIds.get(p.category),
      // Start with healthy stock; admins adjust it daily.
      variants: p.variants.map((v) => ({ ...v, stock: 20 + Math.floor(Math.random() * 30) })),
      soldCount: Math.floor(Math.random() * 200),
    }).save();
    created++;
  }
  console.log(`✔ ${created} products added (${products.length} in seed)`);

  for (const c of coupons) await Coupon.updateOne({ code: c.code }, { $setOnInsert: c }, { upsert: true });
  console.log(`✔ ${coupons.length} coupons (${coupons.map((c) => c.code).join(", ")})`);

  for (const c of classes) {
    const slug = slugify(c.title);
    if (await BakingClass.exists({ slug })) continue;
    const { seats, hourIST, ...rest } = c;
    await BakingClass.create({ ...rest, slug, sessions: upcomingWeekendSessions(hourIST, 4, seats) });
  }
  console.log(`✔ ${classes.length} baking classes`);

  const admin = await User.findOne({ email: env.ADMIN_EMAIL });
  if (!admin) {
    const password = env.ADMIN_PASSWORD ?? `Ct-${crypto.randomBytes(9).toString("base64url")}1`;
    await User.create({ name: "caketown admin", email: env.ADMIN_EMAIL, password, role: "admin" });
    console.log(`✔ admin user created: ${env.ADMIN_EMAIL}`);
    if (!env.ADMIN_PASSWORD) console.log(`  generated password (save it now, it won't be shown again): ${password}`);
  } else if (admin.role !== "admin") {
    admin.role = "admin";
    await admin.save();
    console.log(`✔ ${env.ADMIN_EMAIL} promoted to admin`);
  } else {
    console.log(`✔ admin user exists: ${env.ADMIN_EMAIL}`);
  }

  await disconnectDb();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDb().catch(() => undefined);
  process.exit(1);
});
