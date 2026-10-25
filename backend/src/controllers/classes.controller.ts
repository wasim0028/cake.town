import type { Request, Response } from "express";
import mongoose from "mongoose";
import {
  bookingInputSchema,
  classInputSchema,
  classUpdateSchema,
  paginationSchema,
  type BakingClass as BakingClassDTO,
} from "@caketown/shared";
import { BakingClass, Booking, slugify } from "../models";
import type { BakingClassFields } from "../models/BakingClass";
import { cancelBooking, createBooking } from "../services/bookings";
import { cache, CACHE_KEYS } from "../services/cache";
import { deleteImages } from "../services/cloudinary";
import { conflict, notFound } from "../utils/errors";
import { paginate, parse, parsePatch, userId } from "../utils/http";

type ClassLean = BakingClassFields & { _id: mongoose.Types.ObjectId; sessions: (BakingClassFields["sessions"][number] & { _id: mongoose.Types.ObjectId })[] };

function presentClass(c: ClassLean, opts: { includePast?: boolean } = {}): BakingClassDTO {
  const now = Date.now();
  return {
    id: String(c._id),
    title: c.title,
    slug: c.slug,
    description: c.description,
    instructor: {
      name: c.instructor?.name ?? "caketown baker",
      ...(c.instructor?.bio ? { bio: c.instructor.bio } : {}),
      ...(c.instructor?.photo ? { photo: c.instructor.photo } : {}),
    },
    ...(c.image ? { image: { url: c.image.url, ...(c.image.alt ? { alt: c.image.alt } : {}) } } : {}),
    level: c.level as BakingClassDTO["level"],
    durationMinutes: c.durationMinutes,
    price: c.price,
    location: c.location,
    whatYouWillLearn: c.whatYouWillLearn,
    sessions: c.sessions
      .filter((s) => opts.includePast || s.startsAt.getTime() > now)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .map((s) => ({ id: String(s._id), startsAt: s.startsAt.toISOString(), seats: s.seats, seatsLeft: Math.max(0, s.seats - (s.booked ?? 0)) })),
  };
}

export async function listClasses(_req: Request, res: Response) {
  const items = await cache.wrap(CACHE_KEYS.classes, 120, async () => {
    const classes = (await BakingClass.find({ isActive: true }).lean()) as unknown as ClassLean[];
    return classes
      .map((c) => presentClass(c))
      .sort((a, b) => (a.sessions[0]?.startsAt ?? "9999").localeCompare(b.sessions[0]?.startsAt ?? "9999"));
  });
  res.json({ items });
}

export async function getClass(req: Request, res: Response) {
  const c = (await BakingClass.findOne({ slug: req.params.slug, isActive: true }).lean()) as unknown as ClassLean | null;
  if (!c) throw notFound("Class");
  res.json({ class: presentClass(c) });
}

/* ---------- bookings ---------- */

function presentBooking(b: Record<string, any>) {
  const cls = b.bakingClass && typeof b.bakingClass === "object" && "title" in b.bakingClass ? b.bakingClass : null;
  return {
    id: String(b._id),
    bookingNumber: b.bookingNumber,
    class: cls
      ? { id: String(cls._id), title: cls.title, slug: cls.slug, ...(cls.image ? { image: { url: cls.image.url } } : {}) }
      : { id: String(b.bakingClass), title: b.classTitle ?? "", slug: "" },
    session: { id: String(b.sessionId), startsAt: b.sessionStartsAt?.toISOString?.() ?? b.sessionStartsAt },
    seats: b.seats,
    amount: b.amount,
    paymentMethod: b.paymentMethod,
    paymentStatus: b.paymentStatus,
    status: b.status,
    createdAt: b.createdAt?.toISOString?.() ?? b.createdAt,
  };
}

export async function bookClass(req: Request, res: Response) {
  const input = parse(bookingInputSchema, req.body);
  const result = await createBooking(userId(req), input);
  res.status(201).json({ booking: presentBooking(result.booking.toObject()), ...(result.razorpay ? { razorpay: result.razorpay } : {}) });
}

export async function listMyBookings(req: Request, res: Response) {
  const bookings = await Booking.find({ user: userId(req) }).sort({ sessionStartsAt: -1 }).populate("bakingClass", "title slug image").lean();
  res.json({ items: bookings.map(presentBooking) });
}

export async function cancelMyBooking(req: Request, res: Response) {
  const booking = await cancelBooking(String(req.params.id), { userId: userId(req) });
  res.json({ booking: presentBooking(booking.toObject()) });
}

/* ---------- admin ---------- */

export async function adminListClasses(_req: Request, res: Response) {
  const classes = (await BakingClass.find().sort({ updatedAt: -1 }).lean()) as unknown as ClassLean[];
  res.json({ items: classes.map((c) => ({ ...presentClass(c, { includePast: true }), isActive: c.isActive })) });
}

export async function createClass(req: Request, res: Response) {
  const input = parse(classInputSchema, req.body);
  const c = await BakingClass.create({ ...input, slug: input.slug ?? slugify(input.title) });
  await cache.del(CACHE_KEYS.classes);
  res.status(201).json({ class: presentClass(c.toObject() as unknown as ClassLean, { includePast: true }) });
}

export async function updateClass(req: Request, res: Response) {
  const input = parsePatch(classUpdateSchema, req.body);
  const c = await BakingClass.findById(req.params.id);
  if (!c) throw notFound("Class");
  const oldImage = c.image?.publicId;
  const { sessions, ...rest } = input;
  c.set(rest);
  if (sessions) {
    // Keep booked counts for sessions that still exist (matched by start time).
    const existing = new Map(c.sessions.map((s) => [s.startsAt.getTime(), s]));
    for (const s of c.sessions) {
      const stillThere = sessions.some((n) => n.startsAt.getTime() === s.startsAt.getTime());
      if (!stillThere && (s.booked ?? 0) > 0) throw conflict("A session with bookings can't be removed. Cancel its bookings first.", "SESSION_HAS_BOOKINGS");
    }
    c.set(
      "sessions",
      sessions.map((n) => {
        const old = existing.get(n.startsAt.getTime());
        return old ? { _id: old._id, startsAt: n.startsAt, seats: Math.max(n.seats, old.booked ?? 0), booked: old.booked } : n;
      }),
    );
  }
  await c.save();
  if (input.image && oldImage && oldImage !== input.image.publicId) await deleteImages([oldImage]);
  await cache.del(CACHE_KEYS.classes);
  res.json({ class: presentClass(c.toObject() as unknown as ClassLean, { includePast: true }) });
}

export async function deleteClass(req: Request, res: Response) {
  const hasBookings = await Booking.exists({ bakingClass: req.params.id, status: { $in: ["confirmed", "pending_payment"] } });
  if (hasBookings) throw conflict("This class has active bookings. Hide it instead.", "CLASS_HAS_BOOKINGS");
  const c = await BakingClass.findByIdAndDelete(req.params.id);
  if (!c) throw notFound("Class");
  await deleteImages([c.image?.publicId]);
  await cache.del(CACHE_KEYS.classes);
  res.status(204).end();
}

export async function adminListBookings(req: Request, res: Response) {
  const { page, limit } = parse(paginationSchema, req.query);
  const filter = typeof req.query.classId === "string" && mongoose.isValidObjectId(req.query.classId) ? { bakingClass: req.query.classId } : {};
  const [items, total] = await Promise.all([
    Booking.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("user", "name email phone").populate("bakingClass", "title slug").lean(),
    Booking.countDocuments(filter),
  ]);
  res.json(
    paginate(
      items.map((b) => ({ ...presentBooking(b), user: b.user })),
      total,
      page,
      limit,
    ),
  );
}

export async function adminCancelBooking(req: Request, res: Response) {
  const booking = await cancelBooking(String(req.params.id));
  res.json({ booking: presentBooking(booking.toObject()) });
}
