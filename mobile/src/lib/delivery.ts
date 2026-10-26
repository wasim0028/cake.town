import { DELIVERY_SLOTS, TIMEZONE } from "@caketown/shared";

/**
 * The next delivery slot a cake can make, given a preparation time. Mirrors the API rule:
 * the slot must start at least `prepHours` from now (India time).
 */
export function nextDeliverySlot(prepHours = 4, now = new Date()): { day: "today" | "tomorrow"; slot: string; label: string } {
  const earliest = now.getTime() + prepHours * 3600_000;
  for (let d = 0; d < 2; d++) {
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date(now.getTime() + d * 86400_000));
    for (const slot of DELIVERY_SLOTS) {
      const start = new Date(`${date}T${slot.split("-")[0]}:00+05:30`).getTime();
      if (start >= earliest) {
        return { day: d === 0 ? "today" : "tomorrow", slot, label: formatSlot(slot) };
      }
    }
  }
  return { day: "tomorrow", slot: DELIVERY_SLOTS[0], label: formatSlot(DELIVERY_SLOTS[0]) };
}

/** "16:00-19:00" -> "4–7 pm" ; "10:00-13:00" -> "10 am–1 pm" */
export function formatSlot(slot: string): string {
  const [a, b] = slot.split("-").map((t) => Number(t!.split(":")[0]));
  const fmt = (h: number) => `${h % 12 || 12}`;
  const ap = (h: number) => (h < 12 ? "am" : "pm");
  return ap(a!) === ap(b!) ? `${fmt(a!)}–${fmt(b!)} ${ap(b!)}` : `${fmt(a!)} ${ap(a!)}–${fmt(b!)} ${ap(b!)}`;
}
