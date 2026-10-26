import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";
import { Prose } from "@/components/content/Prose";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = pageMeta({ title: "Terms of service", description: "Ordering, delivery slots, cancellations, refunds and baking classes at caketown.", path: "/terms" });

export default function TermsPage() {
  return (
    <>
      <PageHeader title="Terms of service" intro="The short version: we bake it fresh, deliver it in your slot, and make it right if something goes wrong." crumbs={[{ href: "/terms", label: "Terms" }]} />
      <div className="container" style={{ paddingBottom: "6rem" }}>
        <Prose
          blocks={[
            "## Orders",
            "An order is confirmed when you see the confirmation page and receive the email. Prices include taxes. Pictures and illustrations show the style of a product; hand-finished cakes vary a little.",
            "## Delivery",
            "We deliver within the slot you choose. Occasionally traffic or weather causes a delay; we'll contact you if that happens. Someone needs to be available at the address to receive the order.",
            "## Cancellations and refunds",
            "- You can cancel free of charge from your order page until baking starts.",
            "- Online payments for cancelled orders are refunded in full to the original payment method.",
            "- If something arrives damaged or isn't what you ordered, contact us within 24 hours with a photo and we'll replace or refund it.",
            "## Baking classes",
            "Bookings can be cancelled up to 24 hours before the class for a full refund. If we cancel a class, you'll get a full refund or a seat on another date.",
            "## Coupons",
            "Coupons can't be exchanged for cash, can't be combined, and may have limits on use, minimum order value and the maximum discount.",
            "## Contact",
            "Questions about these terms: hello@caketown.in.",
          ]}
        />
      </div>
    </>
  );
}
