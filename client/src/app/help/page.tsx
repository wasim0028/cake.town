import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";
import Link from "next/link";
import { DELIVERY, formatINR } from "@caketown/shared";
import { PageHeader } from "@/components/layout/PageHeader";
import { Accordion } from "@/components/ui/form";
import styles from "../content.module.css";

export const metadata: Metadata = pageMeta({ title: "Help & questions", description: "Delivery slots, eggless options, payments, cancellations and refunds at caketown.", path: "/help" });

const GROUPS = [
  {
    id: "delivery",
    title: "Delivery",
    items: [
      { q: "When can my order arrive?", a: <p>Pick a three-hour slot at checkout: 10 am–1 pm, 1–4 pm, 4–7 pm or 7–10 pm, up to 30 days ahead. Cakes need about 4 hours to make (cheesecakes 8 hours, designed and photo cakes a day), so earlier slots close automatically.</p> },
      { q: "How much is delivery?", a: <p>Free on orders of {formatINR(DELIVERY.freeAbove)} or more after discounts; {formatINR(DELIVERY.fee)} below that.</p> },
      { q: "Can I track my order?", a: <p>Yes. Your order page shows each step, from placed to baking to out for delivery, and updates on its own. You&rsquo;ll also get emails and, on the app, notifications.</p> },
      { q: "What if nobody is home?", a: <p>The rider calls the number on the address. Add a note at checkout if there&rsquo;s a gate code or someone else will receive it.</p> },
    ],
  },
  {
    id: "faq",
    title: "Cakes and ingredients",
    items: [
      { q: "Which cakes can be eggless?", a: <p>Most of them. Look for &ldquo;Eggless option&rdquo; on a product; it adds a small charge because it&rsquo;s a separate recipe baked on its own trays.</p> },
      { q: "Do you handle allergens?", a: <p>Our kitchen uses wheat, eggs, milk, nuts and soy. We take care to keep things separate, but we can&rsquo;t promise any item is free of traces.</p> },
      { q: "Can I get something not on the menu?", a: <p>Try the <Link href="/cake-builder" className="text-link">cake designer</Link> first. For wedding or very large cakes, <Link href="/contact" className="text-link">write to us</Link>.</p> },
      { q: "How do I store my cake?", a: <p>Fridge, in its box, and out 30 minutes before serving. Our <Link href="/blog/how-to-store-a-cream-cake" className="text-link">storage guide</Link> has the details.</p> },
    ],
  },
  {
    id: "payments",
    title: "Payments, cancellations and refunds",
    items: [
      { q: "How can I pay?", a: <p>UPI, cards, net banking and wallets through Razorpay, or cash (or UPI) on delivery.</p> },
      { q: "Can I cancel?", a: <p>Yes, free of charge from your order page until we start baking. After that, contact us and we&rsquo;ll do what we can.</p> },
      { q: "When will I get my refund?", a: <p>Online payments are refunded in full automatically when an order is cancelled. Banks usually take 5–7 working days to show it.</p> },
      { q: "Do you have coupons?", a: <p>New customers get 10% off their first order (up to ₹150) with WELCOME10, on orders over ₹499.</p> },
    ],
  },
  {
    id: "reviews",
    title: "Accounts and reviews",
    items: [
      { q: "How do reviews work?", a: <p>Anyone with an account can review a product once and edit it later. Reviews from people who received that product are marked &ldquo;Ordered this&rdquo;. We only hide reviews that are spam or abusive.</p> },
      { q: "I forgot my password", a: <p>Use <Link href="/forgot-password" className="text-link">reset password</Link> and we&rsquo;ll email you a link that works for 30 minutes.</p> },
    ],
  },
];

export default function HelpPage() {
  return (
    <>
      <PageHeader title="Help & questions" intro="Answers to what people ask us most. Can't find yours?" crumbs={[{ href: "/help", label: "Help" }]}>
        <p style={{ marginTop: "0.75rem" }}>
          <Link href="/contact" className="text-link">
            Contact us
          </Link>
        </p>
      </PageHeader>
      <div className="container" style={{ paddingBottom: "6rem", maxWidth: "calc(52rem + var(--gutter) * 2)", marginInline: 0 }}>
        {GROUPS.map((g) => (
          <section key={g.id} id={g.id} className={styles.faqGroup} aria-labelledby={`${g.id}-title`}>
            <h2 id={`${g.id}-title`}>{g.title}</h2>
            <Accordion items={g.items} />
          </section>
        ))}
      </div>
    </>
  );
}
