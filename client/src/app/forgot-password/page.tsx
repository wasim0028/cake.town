import type { Metadata } from "next";
import { Suspense } from "react";
import { ForgotForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function Page() {
  return (
    <Suspense>
      <ForgotForm />
    </Suspense>
  );
}
