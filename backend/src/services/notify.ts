import { formatINR, ORDER_STATUS_LABELS, type OrderStatus } from "@caketown/shared";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { User, type BookingDoc, type OrderDoc } from "../models";
import {
  bookingConfirmedEmail,
  contactNotificationEmail,
  newOrderShopEmail,
  orderStatusEmail,
  passwordResetEmail,
  welcomeEmail,
} from "../templates/emails";
import { sendEmail } from "./email";
import { sendPushToUser } from "./push";
import { sendSms } from "./sms";

/**
 * Run work after the response is sent. Notification failures are logged, never thrown, so a
 * slow or broken provider can't delay or fail checkout.
 */
const pending = new Set<Promise<unknown>>();
export function background(label: string, task: () => Promise<unknown>) {
  const p = Promise.resolve()
    .then(task)
    .catch((err) => logger.error({ err, label }, "Background task failed"))
    .finally(() => pending.delete(p));
  pending.add(p);
}
/** Await all queued background work (tests, graceful shutdown). */
export async function flushBackground() {
  while (pending.size) await Promise.allSettled([...pending]);
}

/** One call for every order status change: email + SMS + push, each independent. */
export function notifyOrderStatus(order: OrderDoc) {
  background(`notify:order:${order.orderNumber}:${order.status}`, async () => {
    const user = await User.findById(order.user).select("name email phone").lean();
    if (!user) return;
    const status = order.status as OrderStatus;
    const label = ORDER_STATUS_LABELS[status];
    const id = String(order._id);

    const jobs: Promise<unknown>[] = [];
    const email = orderStatusEmail(order);
    jobs.push(sendEmail({ to: user.email, ...email }));

    // SMS only for the moments that matter on the go.
    if (["placed", "out_for_delivery", "delivered", "cancelled"].includes(status)) {
      const phone = order.address?.phone || user.phone;
      if (phone) {
        jobs.push(
          sendSms(phone, env.MSG91_TEMPLATE_ORDER_UPDATE, {
            name: user.name.split(" ")[0] ?? user.name,
            order: order.orderNumber,
            status: label,
          }),
        );
      }
    }

    jobs.push(
      sendPushToUser(String(user._id), {
        title: `${label} · ${order.orderNumber}`,
        body: email.text.split("\n")[1] ?? label,
        data: { screen: "order", id },
      }),
    );

    if (status === "placed" && env.SHOP_EMAIL) {
      jobs.push(sendEmail({ to: env.SHOP_EMAIL, ...newOrderShopEmail(order) }));
    }

    const results = await Promise.allSettled(jobs);
    for (const r of results) if (r.status === "rejected") logger.warn({ err: r.reason, order: order.orderNumber }, "Notification channel failed");
  });
}

export function notifyBookingConfirmed(booking: BookingDoc) {
  background(`notify:booking:${booking.bookingNumber}`, async () => {
    const user = await User.findById(booking.user).select("email").lean();
    if (!user) return;
    await Promise.allSettled([
      sendEmail({ to: user.email, ...bookingConfirmedEmail(booking) }),
      sendPushToUser(String(booking.user), {
        title: "Class booked!",
        body: `${booking.classTitle} · ${booking.seats} seat(s) · ${formatINR(booking.amount)}`,
        data: { screen: "booking", id: String(booking._id) },
      }),
    ]);
  });
}

export function notifyWelcome(user: { name: string; email: string }) {
  background("notify:welcome", () => sendEmail({ to: user.email, ...welcomeEmail(user.name) }));
}

export function notifyPasswordReset(user: { name: string; email: string }, token: string) {
  const link = `${env.WEB_URL}/reset-password?token=${encodeURIComponent(token)}`;
  background("notify:password-reset", () => sendEmail({ to: user.email, ...passwordResetEmail(user.name, link) }));
}

export function notifyOtp(phone: string, code: string) {
  background("notify:otp", () => sendSms(phone, env.MSG91_TEMPLATE_OTP, { otp: code }));
}

export function notifyContact(m: { name: string; email: string; phone?: string; subject?: string; message: string }) {
  if (!env.SHOP_EMAIL) return;
  background("notify:contact", () => sendEmail({ to: env.SHOP_EMAIL!, replyTo: m.email, ...contactNotificationEmail(m) }));
}
