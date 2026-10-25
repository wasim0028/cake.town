import type { Metadata } from "next";
import { Prose } from "@/components/content/Prose";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Privacy policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <>
      <PageHeader title="Privacy policy" intro="What we collect, why, and what you can ask us to do with it." crumbs={[{ href: "/privacy", label: "Privacy" }]} />
      <div className="container" style={{ paddingBottom: "6rem" }}>
        <Prose
          blocks={[
            "## What we collect",
            "- Your name, email and mobile number when you create an account.",
            "- Delivery addresses you save, and the orders and class bookings you make.",
            "- Reviews you post, which show your first name and the initial of your last name.",
            "We don't see or store your card or UPI details. Online payments are handled by Razorpay.",
            "## Why we use it",
            "- To bake, deliver and support your orders, and to send order updates by email, SMS and app notifications.",
            "- To send the Friday menu email, only if you subscribe. Every email has an unsubscribe link.",
            "## Who we share it with",
            "Only the services that help us run caketown: our payment provider, email and SMS providers, our hosting and database providers, and the delivery partner who brings your order. We never sell your data.",
            "## Your choices",
            "You can update your details and addresses from your account at any time. To get a copy of your data or delete your account, write to hello@caketown.in.",
            "## Cookies",
            "We use essential cookies to keep you signed in and to remember your cart and theme. We don't use advertising cookies.",
          ]}
        />
      </div>
    </>
  );
}
