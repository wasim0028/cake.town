import { Suspense } from "react";
import { OrdersList } from "@/components/admin/Orders";

export const metadata = { title: "Orders" };

export default function Page() {
  return (
    <Suspense>
      <OrdersList />
    </Suspense>
  );
}
