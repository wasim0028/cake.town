import { useEffect, useRef } from "react";
import { useStaffCounts } from "@/components/staff";
import { haptic } from "@/lib/haptics";
import { toast } from "@/lib/stores";

/**
 * For staff with the app open: a toast (and a buzz) when a new order arrives. Push notifications
 * cover the app being closed; this covers the web preview and phones without push set up.
 */
export function StaffWatcher() {
  const { newOrders } = useStaffCounts();
  const seen = useRef<number | null>(null);
  useEffect(() => {
    if (seen.current !== null && newOrders > seen.current) {
      haptic.success();
      const n = newOrders - seen.current;
      toast(n === 1 ? "New order received" : `${n} new orders received`, { tone: "success", body: "Open Staff → Orders to start it." });
    }
    seen.current = newOrders;
  }, [newOrders]);
  return null;
}
