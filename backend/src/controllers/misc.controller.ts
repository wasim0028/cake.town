import type { Request, Response } from "express";
import { z } from "zod";
import { contactSchema, DELIVERY, DELIVERY_SLOTS, deviceTokenSchema, newsletterSchema } from "@caketown/shared";
import { features } from "../config/env";
import { ContactMessage, DeviceToken, Subscriber } from "../models";
import { deleteImages, uploadImage, type ImageFolder } from "../services/cloudinary";
import { notifyContact } from "../services/notify";
import { badRequest, notFound } from "../utils/errors";
import { parse, userId } from "../utils/http";

/* ---------- push notification devices ---------- */

export async function registerDevice(req: Request, res: Response) {
  const input = parse(deviceTokenSchema, req.body);
  // A token belongs to whoever is signed in on that phone now.
  await DeviceToken.findOneAndUpdate(
    { token: input.token },
    { $set: { user: userId(req), platform: input.platform, lastSeenAt: new Date() } },
    { upsert: true },
  );
  res.status(204).end();
}

export async function unregisterDevice(req: Request, res: Response) {
  await DeviceToken.deleteOne({ token: req.params.token, user: userId(req) });
  res.status(204).end();
}

/* ---------- contact & newsletter ---------- */

export async function contact(req: Request, res: Response) {
  const input = parse(contactSchema, req.body);
  await ContactMessage.create({ ...input, ...(req.user ? { user: req.user.id } : {}) });
  notifyContact(input);
  res.status(201).json({ message: "Thanks! We'll get back to you within a day." });
}

export async function subscribe(req: Request, res: Response) {
  const { email } = parse(newsletterSchema, req.body);
  await Subscriber.updateOne({ email }, { $set: { email }, $unset: { unsubscribedAt: 1 } }, { upsert: true });
  res.status(201).json({ message: "You're on the list! 🎉" });
}

/* ---------- contact inbox (admin) ---------- */

export async function adminListMessages(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 20));
  const filter = req.query.handled === "false" ? { handled: false } : req.query.handled === "true" ? { handled: true } : {};
  const [items, total, open] = await Promise.all([
    ContactMessage.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    ContactMessage.countDocuments(filter),
    ContactMessage.countDocuments({ handled: false }),
  ]);
  res.json({ items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), open });
}

export async function adminUpdateMessage(req: Request, res: Response) {
  const { handled } = parse(z.object({ handled: z.boolean() }), req.body);
  const msg = await ContactMessage.findByIdAndUpdate(req.params.id, { $set: { handled } }, { new: true });
  if (!msg) throw notFound("Message");
  res.json({ message: msg });
}

/* ---------- image uploads (admin) ---------- */

const folderSchema = z.enum(["products", "categories", "classes", "avatars", "misc"]).default("products");

export async function uploadImages(req: Request, res: Response) {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (!files.length) throw badRequest("Choose at least one image", "NO_FILES");
  const folder: ImageFolder = parse(folderSchema, req.query.folder);
  const images = await Promise.all(files.map((f) => uploadImage(f.buffer, folder)));
  res.status(201).json({ images });
}

export async function deleteImage(req: Request, res: Response) {
  const { publicId } = parse(z.object({ publicId: z.string().min(3).max(200) }), req.body);
  await deleteImages([publicId]);
  res.status(204).end();
}

/* ---------- public config for the apps ---------- */

export function publicConfig(_req: Request, res: Response) {
  res.json({
    payments: { razorpay: features.razorpay, cod: true },
    delivery: DELIVERY,
    slots: DELIVERY_SLOTS,
    sms: features.sms,
  });
}

/* ---------- health ---------- */

export function health(_req: Request, res: Response) {
  res.json({ ok: true, service: "caketown-api", time: new Date().toISOString(), features });
}
