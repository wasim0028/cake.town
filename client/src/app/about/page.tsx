import type { Metadata } from "next";
import Image from "next/image";
import { BakeArt } from "@/components/art/BakeArt";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import styles from "../content.module.css";

export const metadata: Metadata = {
  title: "Our story",
  description: "How caketown bakes: cakes made after you order, bread fermented slowly, and delivery in a slot you choose.",
  alternates: { canonical: "/about" },
};

const PRINCIPLES = [
  { art: ["Chocolate Truffle Cake", "cakes"], title: "Baked after you order", body: "Cakes aren't sitting in a display fridge waiting for you. We start yours when the order comes in, timed to your delivery slot." },
  { art: ["Classic Sourdough Loaf", "breads"], title: "Slow where it matters", body: "Our sourdough ferments for 36 hours and the croissant dough is laminated by hand. Shortcuts show up in the taste, so we don't take them." },
  { art: ["Vanilla Rainbow Cupcakes", "cupcakes"], title: "Eggless without compromise", body: "Most cakes can be made eggless. They're baked on separate trays from their own recipe, not just the regular one with eggs left out." },
] as const;

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="A neighbourhood bakery, delivered"
        intro="caketown started with one idea: a cake should reach you on the day it was made. Everything else about how we work follows from that."
        crumbs={[{ href: "/about", label: "Our story" }]}
      />
      <div className={`container ${styles.photo}`}>
        <Image src="/images/kitchen.webp" alt="Two caketown bakers decorating a four-tier wedding cake with sugar flowers" width={1080} height={720} sizes="100vw" priority />
      </div>
      <section className="container section" aria-labelledby="how">
        <h2 id="how" className={styles.sectionTitle}>How we bake</h2>
        <ul role="list" className={styles.principles}>
          {PRINCIPLES.map((p) => (
            <li key={p.title}>
              <span className={styles.plate}>
                <BakeArt name={p.art[0]} category={p.art[1]} />
              </span>
              <h3>{p.title}</h3>
              <p className="muted">{p.body}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className={`container ${styles.cta}`}>
        <h2>Come and see for yourself</h2>
        <p className="muted">Book a weekend class in our kitchen, or start with something from today&rsquo;s menu.</p>
        <div className={styles.ctaActions}>
          <Button href="/shop">See the menu</Button>
          <Button href="/classes" variant="secondary">
            Baking classes
          </Button>
        </div>
      </section>
    </>
  );
}
