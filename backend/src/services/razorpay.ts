import crypto from "node:crypto";
import Razorpay from "razorpay";
import { env, features } from "../config/env";
import { unavailable } from "../utils/errors";

let instance: Razorpay | null = null;

function client(): Razorpay {
  if (!features.razorpay) {
    throw unavailable("Online payments are not set up yet. Please choose Cash on Delivery.", "PAYMENTS_DISABLED");
  }
  instance ??= new Razorpay({ key_id: env.RAZORPAY_KEY_ID!, key_secret: env.RAZORPAY_KEY_SECRET! });
  return instance;
}

export function razorpayKeyId(): string {
  return env.RAZORPAY_KEY_ID ?? "";
}

/** Our own reference (order or booking) travels in `notes` so the webhook knows what was paid. */
export interface PaymentNotes {
  type: "order" | "booking";
  ref: string; // Mongo id
  number: string; // CT-... / BK-...
}

export async function createRazorpayOrder(amountPaise: number, notes: PaymentNotes) {
  const order = await client().orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: notes.number,
    notes: { ...notes },
  });
  return { id: order.id, amount: Number(order.amount), currency: "INR" as const };
}

export async function fetchPayment(paymentId: string) {
  return client().payments.fetch(paymentId);
}

export async function refundPayment(paymentId: string, amountPaise: number | undefined, reason?: string) {
  return client().payments.refund(paymentId, {
    ...(amountPaise ? { amount: amountPaise } : {}),
    notes: reason ? { reason } : {},
  });
}

function hmacHex(secret: string, payload: string | Buffer): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/** Checkout callback signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!env.RAZORPAY_KEY_SECRET) return false;
  return safeEqual(hmacHex(env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`), signature);
}

/** Webhook signature: HMAC_SHA256(raw request body, webhook secret). */
export function verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET || !signature) return false;
  return safeEqual(hmacHex(env.RAZORPAY_WEBHOOK_SECRET, rawBody), signature);
}
