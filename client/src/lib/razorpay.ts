"use client";

import type { CheckoutResponse } from "@caketown/shared";
import { api } from "./api";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: (r: unknown) => void) => void };
  }
}

let loading: Promise<boolean> | null = null;

/** Loads Razorpay Checkout once, on demand (only when someone pays online). */
export function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  loading ??= new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => {
      loading = null;
      resolve(false);
    };
    document.body.appendChild(s);
  });
  return loading;
}

export type PayResult = { status: "paid" | "processing" } | { status: "dismissed" } | { status: "failed"; message: string };

/**
 * Opens Razorpay for an order or class booking, then asks our API to confirm the payment with
 * Razorpay. Resolves when the person pays, closes the window, or the payment fails.
 */
export async function payWithRazorpay(rp: NonNullable<CheckoutResponse["razorpay"]>, description: string): Promise<PayResult> {
  if (!(await loadRazorpay()) || !window.Razorpay) {
    return { status: "failed", message: "Couldn't load the payment window. Check your connection, or choose Cash on Delivery." };
  }
  return new Promise((resolve) => {
    const checkout = new window.Razorpay!({
      key: rp.keyId,
      amount: rp.amount,
      currency: rp.currency,
      name: rp.name,
      description,
      order_id: rp.orderId,
      prefill: rp.prefill,
      theme: { color: "#C8893B" },
      handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        try {
          const v = await api.post<{ status: "paid" | "processing" }>("/payments/razorpay/verify", {
            razorpayOrderId: r.razorpay_order_id,
            razorpayPaymentId: r.razorpay_payment_id,
            razorpaySignature: r.razorpay_signature,
          });
          resolve({ status: v.status });
        } catch {
          // The webhook will still confirm it; show it as processing rather than failed.
          resolve({ status: "processing" });
        }
      },
      modal: { ondismiss: () => resolve({ status: "dismissed" }), confirm_close: true },
    });
    checkout.on("payment.failed", (r) => {
      const e = (r as { error?: { description?: string } }).error;
      resolve({ status: "failed", message: e?.description ?? "The payment didn't go through." });
    });
    checkout.open();
  });
}
