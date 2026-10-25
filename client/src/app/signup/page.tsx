import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default function Page() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
