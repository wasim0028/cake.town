import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function Page() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
