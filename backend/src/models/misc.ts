import mongoose from "mongoose";
import { DEVICE_PLATFORMS } from "@caketown/shared";
import { toJSONPlugin } from "./plugins";

/** Expo push tokens, one per installed app. */
const deviceTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    token: { type: String, required: true, unique: true },
    platform: { type: String, enum: DEVICE_PLATFORMS, required: true },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);
deviceTokenSchema.plugin(toJSONPlugin);
export const DeviceToken = mongoose.model("DeviceToken", deviceTokenSchema);

/** Razorpay webhook event ids we already processed, so retries are ignored. */
const webhookEventSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true },
    eventId: { type: String, required: true },
    event: String,
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);
webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
// Keep 90 days of history.
webhookEventSchema.index({ processedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
export const WebhookEvent = mongoose.model("WebhookEvent", webhookEventSchema);

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    subject: String,
    message: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    handled: { type: Boolean, default: false },
  },
  { timestamps: true },
);
contactMessageSchema.plugin(toJSONPlugin);
export const ContactMessage = mongoose.model("ContactMessage", contactMessageSchema);

const subscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    unsubscribedAt: Date,
  },
  { timestamps: true },
);
subscriberSchema.plugin(toJSONPlugin);
export const Subscriber = mongoose.model("Subscriber", subscriberSchema);
