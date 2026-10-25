"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { nextDeliverySlot } from "@/lib/delivery";
import styles from "./NextSlot.module.css";

/**
 * "Order now for delivery today, 7–10 pm": the earliest slot a made-to-order cake can make
 * (4 hours' baking), worked out live in India time and refreshed every minute.
 */
export function NextSlot() {
  const [slot, setSlot] = useState<ReturnType<typeof nextDeliverySlot> | null>(null);

  useEffect(() => {
    const update = () => setSlot(nextDeliverySlot(4));
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <p className={styles.slot} aria-live="polite">
      <span className={styles.dot} aria-hidden />
      <Clock size={16} aria-hidden />
      {slot ? (
        <span>
          Order a cake now for delivery <strong>{slot.day}, {slot.label}</strong>
        </span>
      ) : (
        <span>Pick a three-hour delivery slot at checkout</span>
      )}
    </p>
  );
}
