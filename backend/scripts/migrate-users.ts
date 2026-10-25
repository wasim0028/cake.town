/**
 * One-time migration for users created by the original Cake Town app.
 *
 *  - removes `cpassword` (a second bcrypt hash of the password that should never be stored)
 *  - removes the old `tokens` array (JWTs were stored forever; we now use refresh sessions)
 *  - adds `role: "customer"` where missing
 *  - lowercases emails and converts phone numbers from Number to a 10-digit string
 *
 * Passwords are bcrypt hashes in both versions, so existing users log in as before.
 * Safe to run more than once.  Usage: npm run migrate:users  (add --dry-run to preview)
 */
import mongoose from "mongoose";
import { connectDb, disconnectDb } from "../src/config/db";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  await connectDb();
  const users = mongoose.connection.collection("users");

  const legacy = await users
    .find({
      $or: [
        { cpassword: { $exists: true } },
        { tokens: { $exists: true } },
        { role: { $exists: false } },
        { phone: { $type: "number" } },
      ],
    })
    .project({ email: 1, phone: 1 })
    .toArray();

  console.log(`${legacy.length} user(s) need migrating${dryRun ? " (dry run)" : ""}`);
  let done = 0;

  for (const u of legacy) {
    const set: Record<string, unknown> = {};
    if (typeof u.email === "string" && u.email !== u.email.toLowerCase().trim()) set.email = u.email.toLowerCase().trim();
    if (typeof u.phone === "number") {
      const digits = String(u.phone).replace(/^91(?=\d{10}$)/, "");
      set.phone = digits;
    }
    if (dryRun) {
      console.log(` - ${u.email}: unset cpassword/tokens, set role=customer${Object.keys(set).length ? `, ${JSON.stringify(set)}` : ""}`);
      continue;
    }
    try {
      await users.updateOne(
        { _id: u._id },
        [
          { $set: { ...set, role: { $ifNull: ["$role", "customer"] }, wishlist: { $ifNull: ["$wishlist", []] } } },
          { $unset: ["cpassword", "tokens"] },
        ],
      );
      done++;
    } catch (err) {
      // Most likely two old accounts with the same email in different letter case.
      console.error(` ! ${u.email}: ${(err as Error).message}`);
    }
  }

  if (!dryRun) {
    // Make sure the unique email index exists now that emails are normalised.
    await users.createIndex({ email: 1 }, { unique: true }).catch((err) => console.error(" ! email index:", err.message));
    console.log(`✔ migrated ${done} user(s)`);
  }
  await disconnectDb();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDb().catch(() => undefined);
  process.exit(1);
});
