import { Suspense } from "react";
import { ProductsList } from "@/components/admin/Products";

export const metadata = { title: "Products" };

export default function Page() {
  return (
    <Suspense>
      <ProductsList />
    </Suspense>
  );
}
