import { formatINR, ORDER_STATUS_LABELS, type OrderStatus } from "@caketown/shared";
import { env } from "../config/env";

/** Escape anything user-provided before it goes into HTML. */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const C = { cream: "#F7F3EE", espresso: "#1A1714", caramel: "#C8893B", text: "#1E1B18", muted: "#7A6F66", line: "#E8E0D6" };

function layout(title: string, body: string, preheader = ""): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:${C.cream};font-family:Helvetica,Arial,sans-serif;color:${C.text}">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:${C.espresso};padding:22px 28px;font-family:Georgia,serif;font-size:24px;color:#fff;letter-spacing:.3px">cake<span style="color:${C.caramel}">town</span></td></tr>
<tr><td style="padding:28px">${body}</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid ${C.line};font-size:12px;color:${C.muted}">Fresh baked happiness, delivered. · <a href="${esc(env.WEB_URL)}" style="color:${C.caramel}">${esc(env.WEB_URL.replace(/^https?:\/\//, ""))}</a></td></tr>
</table></td></tr></table></body></html>`;
}

function button(href: string, label: string) {
  return `<a href="${esc(href)}" style="display:inline-block;background:${C.espresso};color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold;font-size:14px">${esc(label)}</a>`;
}

interface OrderLike {
  id?: string;
  _id?: unknown;
  orderNumber: string;
  status: string;
  items: { name: string; variantLabel: string; quantity: number; lineTotal: number; eggless?: boolean | null; message?: string | null; customSummary?: string | null }[];
  subtotal: number;
  discount?: number | null;
  deliveryFee?: number | null;
  total: number;
  deliveryDate: string;
  deliverySlot: string;
  paymentMethod: string;
  address: { fullName?: string | null; line1?: string | null; city?: string | null; pincode?: string | null };
}

const STATUS_COPY: Record<OrderStatus, { subject: string; headline: string; line: string }> = {
  pending_payment: { subject: "Complete your payment", headline: "Almost there!", line: "We're holding your order while you finish the payment." },
  placed: { subject: "Order confirmed", headline: "Thank you for your order!", line: "We've received your order and our bakers will start on it soon." },
  baking: { subject: "Your order is in the oven", headline: "It's baking!", line: "Our bakers are preparing your order right now." },
  out_for_delivery: { subject: "Out for delivery", headline: "On its way!", line: "Your order has left the bakery and is heading to you." },
  delivered: { subject: "Delivered — enjoy!", headline: "Delivered", line: "We hope it brings a smile. We'd love a review!" },
  cancelled: { subject: "Order cancelled", headline: "Your order was cancelled", line: "If you paid online, any refund goes back to the original payment method within 5–7 working days." },
};

export function orderStatusEmail(order: OrderLike) {
  const copy = STATUS_COPY[order.status as OrderStatus] ?? STATUS_COPY.placed;
  const id = String(order.id ?? order._id);
  const rows = order.items
    .map(
      (i) => `<tr>
<td style="padding:8px 0;border-bottom:1px solid ${C.line}">${esc(i.name)} <span style="color:${C.muted}">· ${esc(i.variantLabel)}${i.eggless ? " · eggless" : ""} × ${i.quantity}</span>${
        i.customSummary ? `<br><span style="color:${C.muted};font-size:12px">${esc(i.customSummary)}</span>` : ""
      }${i.message ? `<br><span style="color:${C.muted};font-size:12px">Message: “${esc(i.message)}”</span>` : ""}</td>
<td align="right" style="padding:8px 0;border-bottom:1px solid ${C.line}">${formatINR(i.lineTotal)}</td></tr>`,
    )
    .join("");
  const totals = [
    ["Subtotal", formatINR(order.subtotal)],
    ...(order.discount ? [["Discount", `−${formatINR(order.discount)}`]] : []),
    ["Delivery", order.deliveryFee ? formatINR(order.deliveryFee) : "Free"],
  ]
    .map(([k, v]) => `<tr><td style="padding:4px 0;color:${C.muted}">${k}</td><td align="right" style="padding:4px 0">${v}</td></tr>`)
    .join("");

  const body = `
<p style="margin:0 0 4px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${C.caramel}">${esc(ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status)}</p>
<h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px">${copy.headline}</h1>
<p style="margin:0 0 20px;color:${C.muted};line-height:1.5">${copy.line}</p>
<p style="margin:0 0 16px;font-size:14px">Order <strong>${esc(order.orderNumber)}</strong> · Delivery on <strong>${esc(order.deliveryDate)}</strong>, ${esc(order.deliverySlot)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${rows}${totals}
<tr><td style="padding:10px 0;font-weight:bold;font-size:16px">Total</td><td align="right" style="padding:10px 0;font-weight:bold;font-size:16px">${formatINR(order.total)}</td></tr></table>
<p style="margin:16px 0 24px;font-size:13px;color:${C.muted}">Delivering to ${esc(order.address.fullName)}, ${esc(order.address.line1)}, ${esc(order.address.city)} ${esc(order.address.pincode)} · ${order.paymentMethod === "cod" ? "Cash on delivery" : "Paid online"}</p>
${button(`${env.WEB_URL}/orders/${id}`, "Track your order")}`;

  return {
    subject: `${copy.subject} · ${order.orderNumber}`,
    html: layout(copy.subject, body, `${copy.line}`),
    text: `${copy.headline}\n${copy.line}\nOrder ${order.orderNumber}, total ${formatINR(order.total)}.\nTrack: ${env.WEB_URL}/orders/${id}`,
  };
}

export function passwordResetEmail(name: string, link: string) {
  const body = `
<h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px">Reset your password</h1>
<p style="margin:0 0 20px;color:${C.muted};line-height:1.5">Hi ${esc(name)}, we received a request to reset your caketown password. This link works for 30 minutes.</p>
${button(link, "Choose a new password")}
<p style="margin:24px 0 0;font-size:12px;color:${C.muted}">Didn't ask for this? You can ignore this email; your password won't change.</p>`;
  return {
    subject: "Reset your caketown password",
    html: layout("Reset your password", body, "Reset link inside (valid 30 minutes)"),
    text: `Reset your caketown password (valid 30 minutes): ${link}`,
  };
}

export function welcomeEmail(name: string) {
  const body = `
<h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px">Welcome to caketown, ${esc(name)}!</h1>
<p style="margin:0 0 20px;color:${C.muted};line-height:1.5">Fresh cakes, breads and pastries, baked daily and delivered to your door. Use code <strong style="color:${C.text}">WELCOME10</strong> for 10% off your first order.</p>
${button(`${env.WEB_URL}/shop`, "Start shopping")}`;
  return { subject: "Welcome to caketown 🎂", html: layout("Welcome", body, "10% off your first order inside"), text: `Welcome to caketown! Use WELCOME10 for 10% off. ${env.WEB_URL}/shop` };
}

export function bookingConfirmedEmail(b: { bookingNumber: string; classTitle?: string | null; sessionStartsAt?: Date | null; seats: number; amount: number; paymentMethod: string }) {
  const when = b.sessionStartsAt
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(b.sessionStartsAt)
    : "";
  const body = `
<h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px">You're booked!</h1>
<p style="margin:0 0 16px;color:${C.muted};line-height:1.5"><strong style="color:${C.text}">${esc(b.classTitle)}</strong><br>${esc(when)}</p>
<p style="margin:0 0 20px;font-size:14px">Booking ${esc(b.bookingNumber)} · ${b.seats} seat${b.seats > 1 ? "s" : ""} · ${formatINR(b.amount)} ${b.paymentMethod === "pay_at_venue" ? "(pay at the studio)" : "(paid)"}</p>
${button(`${env.WEB_URL}/account/bookings`, "View booking")}`;
  return { subject: `Class booked · ${b.classTitle ?? ""}`, html: layout("Class booked", body), text: `Booked: ${b.classTitle} on ${when}. Booking ${b.bookingNumber}.` };
}

export function contactNotificationEmail(m: { name: string; email: string; phone?: string; subject?: string; message: string }) {
  const body = `
<h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:22px">New message from the website</h1>
<p style="margin:0 0 6px"><strong>${esc(m.name)}</strong> &lt;${esc(m.email)}&gt;${m.phone ? ` · ${esc(m.phone)}` : ""}</p>
${m.subject ? `<p style="margin:0 0 6px;color:${C.muted}">${esc(m.subject)}</p>` : ""}
<p style="margin:12px 0 0;white-space:pre-wrap;line-height:1.5">${esc(m.message)}</p>`;
  return { subject: `Website enquiry: ${m.subject ?? m.name}`, html: layout("New enquiry", body), text: `${m.name} <${m.email}>\n\n${m.message}` };
}

export function newOrderShopEmail(order: OrderLike) {
  const e = orderStatusEmail(order);
  return { ...e, subject: `🧁 New order ${order.orderNumber} · ${formatINR(order.total)} · ${order.deliveryDate} ${order.deliverySlot}` };
}
