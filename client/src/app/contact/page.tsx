import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";
import { ContactForm } from "@/components/content/ContactForm";
import { PageHeader } from "@/components/layout/PageHeader";
import styles from "../content.module.css";

export const metadata: Metadata = pageMeta({ title: "Contact us", description: "Questions about an order, a custom or wedding cake, or a class? Write to caketown and we'll reply within a day.", path: "/contact" });

/** Set NEXT_PUBLIC_SHOP_MAP_QUERY (e.g. "caketown, 12 Park Street, City") to show a map. */
const MAP_QUERY = process.env.NEXT_PUBLIC_SHOP_MAP_QUERY;
const SHOP_ADDRESS = process.env.NEXT_PUBLIC_SHOP_ADDRESS;

export default function ContactPage() {
  return (
    <>
      <PageHeader title="Talk to us" intro="For orders, custom cakes, corporate gifting or classes. We reply within a day." crumbs={[{ href: "/contact", label: "Contact" }]} />
      <div className={`container ${styles.two}`}>
        <ContactForm />
        <aside className={styles.aside}>
          <div>
            <h2>Email</h2>
            <p>
              <a href="mailto:hello@caketown.in" className="text-link">
                hello@caketown.in
              </a>
            </p>
          </div>
          <div>
            <h2>Kitchen hours</h2>
            <p className="muted">Every day, 7 am – 10 pm. Deliveries run 10 am – 10 pm in three-hour slots.</p>
          </div>
          {SHOP_ADDRESS && (
            <div>
              <h2>Visit</h2>
              <p className="muted">{SHOP_ADDRESS}</p>
            </div>
          )}
          {MAP_QUERY && (
            <iframe
              title="Map showing the caketown kitchen"
              className={styles.map}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&output=embed`}
            />
          )}
        </aside>
      </div>
    </>
  );
}
