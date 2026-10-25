"use client";

import { use, Suspense } from "react";
import { OrderTracking } from "@/components/account/OrderTracking";

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <OrderTracking id={id} />
    </Suspense>
  );
}
