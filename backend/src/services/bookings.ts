import type { BookingInput } from "@caketown/shared";
import { env, features } from "../config/env";
import { logger } from "../config/logger";
import { BakingClass, Booking, User, type BookingDoc } from "../models";
import { AppError, conflict, notFound } from "../utils/errors";
import { cache, CACHE_KEYS } from "./cache";
import { newOrderNumber } from "./orders";
import { notifyBookingConfirmed } from "./notify";
import { createRazorpayOrder, razorpayKeyId, refundPayment } from "./razorpay";

async function releaseSeats(classId: unknown, sessionId: unknown, seats: number) {
  await BakingClass.updateOne(
    { _id: classId, sessions: { $elemMatch: { _id: sessionId, booked: { $gte: seats } } } },
    { $inc: { "sessions.$.booked": -seats } },
  );
  await cache.del(CACHE_KEYS.classes);
}

export async function createBooking(userId: string, input: BookingInput) {
  if (input.paymentMethod === "razorpay" && !features.razorpay) {
    throw new AppError(503, "PAYMENTS_DISABLED", "Online payments are not set up yet. Choose “Pay at the studio”.");
  }
  const cls = await BakingClass.findOne({ _id: input.classId, isActive: true }).lean();
  if (!cls) throw notFound("Class");
  const session = cls.sessions.find((s) => String(s._id) === input.sessionId);
  if (!session) throw notFound("Session");
  if (session.startsAt.getTime() < Date.now() + 60 * 60_000) throw new AppError(422, "SESSION_CLOSED", "Bookings for this session have closed");

  // Atomic seat reservation: only succeeds if enough seats are left.
  const res = await BakingClass.updateOne(
    { _id: cls._id, sessions: { $elemMatch: { _id: session._id, booked: { $lte: session.seats - input.seats } } } },
    { $inc: { "sessions.$.booked": input.seats } },
  );
  if (res.modifiedCount !== 1) throw conflict("Not enough seats left in this session", "SOLD_OUT");
  await cache.del(CACHE_KEYS.classes);

  const online = input.paymentMethod === "razorpay";
  const amount = cls.price * input.seats;
  const booking = await Booking.create({
    bookingNumber: newOrderNumber("BK"),
    user: userId,
    bakingClass: cls._id,
    sessionId: session._id,
    classTitle: cls.title,
    sessionStartsAt: session.startsAt,
    seats: input.seats,
    amount,
    paymentMethod: input.paymentMethod,
    paymentStatus: "pending",
    status: online ? "pending_payment" : "confirmed",
    ...(online ? { paymentExpiresAt: new Date(Date.now() + env.PAYMENT_HOLD_MINUTES * 60_000) } : {}),
  });

  if (!online) {
    notifyBookingConfirmed(booking);
    return { booking };
  }

  try {
    const user = await User.findById(userId).select("name email phone").lean();
    const rp = await createRazorpayOrder(amount, { type: "booking", ref: String(booking._id), number: booking.bookingNumber });
    booking.set("razorpay.orderId", rp.id);
    await booking.save();
    return {
      booking,
      razorpay: {
        keyId: razorpayKeyId(),
        orderId: rp.id,
        amount,
        currency: "INR" as const,
        name: "caketown",
        prefill: { name: user?.name ?? "", email: user?.email ?? "", ...(user?.phone ? { contact: user.phone } : {}) },
      },
    };
  } catch (err) {
    logger.error({ err }, "Razorpay order for booking failed");
    await cancelBooking(String(booking._id), { notify: false });
    throw new AppError(502, "PAYMENT_START_FAILED", "We couldn't start the payment. Please try again.");
  }
}

export async function markBookingPaid(bookingId: string, paymentId: string): Promise<BookingDoc | null> {
  const updated = await Booking.findOneAndUpdate(
    { _id: bookingId, status: "pending_payment" },
    { $set: { status: "confirmed", paymentStatus: "paid", "razorpay.paymentId": paymentId }, $unset: { paymentExpiresAt: 1 } },
    { new: true },
  );
  if (updated) {
    notifyBookingConfirmed(updated);
    return updated;
  }
  const existing = await Booking.findById(bookingId);
  if (existing?.status === "cancelled" && existing.paymentStatus === "pending") {
    try {
      await refundPayment(paymentId, undefined, "Booking expired before payment completed");
      existing.paymentStatus = "refunded";
      existing.set("razorpay.paymentId", paymentId);
      await existing.save();
    } catch (err) {
      logger.error({ err, booking: existing.bookingNumber }, "Automatic booking refund failed");
    }
  }
  return existing;
}

export async function cancelBooking(bookingId: string, opts: { userId?: string; notify?: boolean } = {}) {
  const filter: Record<string, unknown> = { _id: bookingId, status: { $in: ["pending_payment", "confirmed"] } };
  if (opts.userId) {
    filter.user = opts.userId;
    // Customers can cancel up to 24 hours before the class; admins any time.
    const current = await Booking.findOne(filter).select("sessionStartsAt").lean();
    if (!current) throw conflict("This booking can't be cancelled", "CANNOT_CANCEL");
    if (current.sessionStartsAt && current.sessionStartsAt.getTime() - Date.now() < 24 * 3600_000) {
      throw new AppError(422, "TOO_LATE_TO_CANCEL", "Bookings can be cancelled up to 24 hours before the class");
    }
  }
  const booking = await Booking.findOneAndUpdate(filter, { $set: { status: "cancelled" }, $unset: { paymentExpiresAt: 1 } }, { new: true });
  if (!booking) throw conflict("This booking can't be cancelled", "CANNOT_CANCEL");
  await releaseSeats(booking.bakingClass, booking.sessionId, booking.seats);
  if (booking.paymentStatus === "paid" && booking.razorpay?.paymentId) {
    try {
      await refundPayment(booking.razorpay.paymentId, undefined, "Booking cancelled");
      booking.paymentStatus = "refunded";
      await booking.save();
    } catch (err) {
      logger.error({ err, booking: booking.bookingNumber }, "Booking refund failed — refund manually");
    }
  }
  return booking;
}

export async function expireUnpaidBookings(now = new Date()): Promise<number> {
  const stale = await Booking.find({ status: "pending_payment", paymentExpiresAt: { $lt: now } }).select("_id").lean();
  let n = 0;
  for (const b of stale) {
    try {
      await cancelBooking(String(b._id), { notify: false });
      n++;
    } catch {
      /* already handled */
    }
  }
  return n;
}
