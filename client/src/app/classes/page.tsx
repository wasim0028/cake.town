import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";
import Image from "next/image";
import { ClassCard } from "@/components/classes/Classes";
import { PageHeader } from "@/components/layout/PageHeader";
import { Reveal } from "@/components/layout/Reveal";
import { getClasses } from "@/lib/server-api";
import styles from "./classes.module.css";

export const metadata: Metadata = pageMeta({ title: "Baking classes", description: "Small weekend baking classes in the caketown kitchen: cake decorating, sourdough, French pastry and a kids' cupcake party.", path: "/classes" });

export const revalidate = 120;

export default async function ClassesPage() {
  const classes = await getClasses();
  return (
    <>
      <PageHeader
        title="Bake it with us"
        intro="Weekend classes for up to twelve people, in the same kitchen our cakes come from. Aprons, ingredients and a box to take everything home are included."
        crumbs={[{ href: "/classes", label: "Baking classes" }]}
      />
      <div className={`container ${styles.photo}`}>
        <Image src="/images/kitchen.webp" alt="Two bakers adding sugar flowers to a tall white wedding cake in the caketown kitchen" width={1080} height={720} sizes="100vw" priority />
      </div>
      <section className="container section" aria-label="Classes">
        {classes.length ? (
          <Reveal as="ul" role="list" className={styles.grid}>
            {classes.map((c) => (
              <li key={c.id} data-reveal-item>
                <ClassCard c={c} />
              </li>
            ))}
          </Reveal>
        ) : (
          <p className="lede">New dates are being planned. Check back soon, or subscribe to the Friday email to hear first.</p>
        )}
      </section>
    </>
  );
}
