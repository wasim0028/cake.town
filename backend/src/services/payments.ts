import { logger } from "../config/logger";
import { Booking, Order, WebhookEvent } from "../models";
import { AppError, notFound } from "../utils/errors";
import { markBookingPaid } from "./bookings";
import { markOrderPaid, markOrderPaymentFailed } from "./orders";
import { fetchPayment, verifyPaymentSignature } from "./razorpay";

type Target = { kind: "order"; id: string } | { kind: "booking"; id: string };

async function findTarget(razorpayOrderId: string, userId?: string): Promise<Target | null> {
  const userFilter = userId ? { user: userId } : {};
  const order = await Order.findOne({ "razorpay.orderId": razorpayOrderId, ...userFilter }).select("_id").lean();
  if (order) return { kind: "order", id: String(order._id) };
  const booking = await Booking.findOne({ "razorpay.orderId": razorpayOrderId, ...userFilter }).select("_id").lean();
  if (booking) return { kind: "booking", id: String(booking._id) };
  return null;
}

async function markPaid(target: Target, paymentId: string) {
  return target.kind === "order" ? markOrderPaid(target.id, paymentId) : markBookingPaid(target.id, paymentId);
}

/**
 * Called by the app right after Razorpay Checkout succeeds. We check the signature AND ask
 * Razorpay for the payment's real status before marking it paid; the webhook does the same
 * independently, and whichever comes first wins.
 */
export async function verifyClientPayment(
  userId: string,
  input: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
) {
  if (!verifyPaymentSignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature)) {
    throw new AppError(400, "BAD_SIGNATURE", "Payment could not be verified");
  }
  const target = await findTarget(input.razorpayOrderId, userId);
  if (!target) throw notFound("Order");

  const payment = await fetchPayment(input.razorpayPaymentId);
  if (payment.order_id !== input.razorpayOrderId) throw new AppError(400, "PAYMENT_MISMATCH", "Payment does not match this order");
  if (payment.status !== "captured") {
    // Still processing (e.g. "authorized"); the webhook will confirm it.
    return { status: "processing" as const, target };
  }
  await markPaid(target, payment.id);
  return { status: "paid" as const, target };
}

interface RazorpayWebhook {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id: string; status: string; error_description?: string } };
    order?: { entity: { id: string } };
    refund?: { entity: { id: string; payment_id: string; amount: number } };
  };
}

/** Razorpay webhook (signature already verified by the route). Safe to receive twice. */
export async function handleRazorpayWebhook(body: RazorpayWebhook, eventId: string | undefined) {
  if (eventId) {
    try {
      await WebhookEvent.create({ provider: "razorpay", eventId, event: body.event });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        logger.info({ eventId }, "Duplicate Razorpay webhook ignored");
        return { duplicate: true };
      }
      throw err;
    }
  }

  const payment = body.payload.payment?.entity;
  switch (body.event) {
    case "payment.captured":
    case "order.paid": {
      if (!payment) break;
      const target = await findTarget(payment.order_id);
      if (!target) {
        logger.warn({ rzpOrder: payment.order_id }, "Webhook for unknown Razorpay order");
        break;
      }
      await markPaid(target, payment.id);
      break;
    }
    case "payment.failed": {
      if (!payment) break;
      const target = await findTarget(payment.order_id);
      if (target?.kind === "order") await markOrderPaymentFailed(target.id);
      break;
    }
    case "refund.processed": {
      const refund = body.payload.refund?.entity;
      if (refund) {
        await Order.updateOne(
          { "razorpay.paymentId": refund.payment_id },
          { $set: { paymentStatus: "refunded", "razorpay.refundId": refund.id, "razorpay.refundedAmount": refund.amount } },
        );
        await Booking.updateOne({ "razorpay.paymentId": refund.payment_id }, { $set: { paymentStatus: "refunded" } });
      }
      break;
    }
    default:
      logger.debug({ event: body.event }, "Unhandled Razorpay event");
  }
  return { duplicate: false };
}
